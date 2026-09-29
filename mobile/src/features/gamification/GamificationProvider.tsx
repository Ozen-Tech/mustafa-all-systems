import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  gamificationService,
  GamificationProfile,
  Rarity,
  RARITY_COLOR,
  RARITY_LABEL,
  UnlockedAchievement,
} from '../../services/gamificationService';
import { offlineSyncService } from '../../services/offlineSyncService';
import { isJuiceMuted, juice, loadJuicePrefs, setJuiceMuted } from '../../utils/juice';
import { colors, theme } from '../../styles/theme';

const USE_NATIVE = Platform.OS !== 'web';

type ModalItem =
  | { type: 'chest' }
  | { type: 'level'; level: number; title: string }
  | { type: 'achievement'; achievement: UnlockedAchievement };

type Toast = { id: number; label: string; amount: number };

interface GamificationContextValue {
  profile: GamificationProfile | null;
  sync: () => Promise<void>;
  refresh: () => Promise<void>;
  openChests: () => void;
  muted: boolean;
  setMuted: (value: boolean) => void;
}

const GamificationContext = createContext<GamificationContextValue>({
  profile: null,
  sync: async () => {},
  refresh: async () => {},
  openChests: () => {},
  muted: false,
  setMuted: () => {},
});

export function useGamification() {
  return useContext(GamificationContext);
}

function XpToast({ toast, onDone }: { toast: Toast; onDone: (id: number) => void }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.spring(anim, { toValue: 1, useNativeDriver: USE_NATIVE, friction: 6 }),
      Animated.delay(1700),
      Animated.timing(anim, { toValue: 2, duration: 350, useNativeDriver: USE_NATIVE }),
    ]).start(() => onDone(toast.id));
  }, [anim, onDone, toast.id]);

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          opacity: anim.interpolate({ inputRange: [0, 1, 2], outputRange: [0, 1, 0] }),
          transform: [
            { translateY: anim.interpolate({ inputRange: [0, 1, 2], outputRange: [24, 0, -30] }) },
            { scale: anim.interpolate({ inputRange: [0, 1, 2], outputRange: [0.8, 1, 1] }) },
          ],
        },
      ]}
    >
      <Text style={styles.toastAmount}>+{toast.amount} XP</Text>
      <Text style={styles.toastLabel} numberOfLines={1}>
        {toast.label}
      </Text>
    </Animated.View>
  );
}

function Burst({ color, trigger }: { color: string; trigger: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, { toValue: 1, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: USE_NATIVE }).start();
  }, [anim, trigger]);
  const pieces = ['✨', '⭐', '✨', '🎉', '✨', '⭐', '✨', '🎊'];
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((p, i) => {
        const angle = (i / pieces.length) * Math.PI * 2;
        return (
          <Animated.Text
            key={i}
            style={[
              styles.burstPiece,
              { color },
              {
                opacity: anim.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 0] }),
                transform: [
                  { translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(angle) * 130] }) },
                  { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(angle) * 130] }) },
                  { scale: anim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.4, 1.3, 0.9] }) },
                ],
              },
            ]}
          >
            {p}
          </Animated.Text>
        );
      })}
    </View>
  );
}

function CountUp({ to, style }: { to: number; style: any }) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let frame = 0;
    const steps = 20;
    const id = setInterval(() => {
      frame += 1;
      setValue(Math.round((to * frame) / steps));
      if (frame >= steps) clearInterval(id);
    }, 30);
    return () => clearInterval(id);
  }, [to]);
  return <Text style={style}>+{value} XP</Text>;
}

function ChestModal({
  profile,
  onOpened,
  onClose,
}: {
  profile: GamificationProfile | null;
  onOpened: (result: Awaited<ReturnType<typeof gamificationService.openChest>>) => void;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<'closed' | 'shaking' | 'revealed' | 'error'>('closed');
  const [reveal, setReveal] = useState<{ rarity: Rarity; xp: number } | null>(null);
  const [showOdds, setShowOdds] = useState(false);
  const shake = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(0)).current;

  const pending = profile?.pendingChests || [];
  const next = pending[0];

  useEffect(() => {
    if (!next && phase === 'closed') onClose();
  }, [next, phase, onClose]);

  async function open() {
    if (!next) return;
    setPhase('shaking');
    juice.chestShake();
    shake.setValue(0);
    const shakeAnim = Animated.sequence(
      Array.from({ length: 6 }, (_, i) =>
        Animated.timing(shake, { toValue: i % 2 === 0 ? 1 : -1, duration: 90, useNativeDriver: USE_NATIVE })
      ).concat([Animated.timing(shake, { toValue: 0, duration: 90, useNativeDriver: USE_NATIVE })])
    );
    try {
      const [result] = await Promise.all([
        gamificationService.openChest(next.id),
        new Promise((resolve) => shakeAnim.start(() => resolve(null))),
      ]);
      setReveal({ rarity: result.chest.rarity, xp: result.chest.xp });
      setPhase('revealed');
      pop.setValue(0);
      Animated.spring(pop, { toValue: 1, friction: 4, useNativeDriver: USE_NATIVE }).start();
      juice.chestOpen(result.chest.rarity);
      onOpened(result);
    } catch {
      setPhase('error');
    }
  }

  function collect() {
    setReveal(null);
    setPhase('closed');
  }

  const kindLabel = next?.kind === 'DAY' ? 'Baú do dia fechado' : 'Baú da loja';
  const odds = profile?.chestOdds?.[next?.kind || 'STORE'] || [];
  const color = reveal ? RARITY_COLOR[reveal.rarity] : colors.accent[500];

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          {phase === 'revealed' && reveal ? (
            <>
              <Burst color={color} trigger={reveal.xp} />
              <Text style={[styles.rarity, { color }]}>{RARITY_LABEL[reveal.rarity].toUpperCase()}</Text>
              <Animated.Text
                style={[
                  styles.chestEmoji,
                  { transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }] },
                ]}
              >
                {reveal.rarity === 'EPIC' ? '💎' : reveal.rarity === 'RARE' ? '💠' : '🪙'}
              </Animated.Text>
              <CountUp to={reveal.xp} style={[styles.bigXp, { color }]} />
              <Pressable style={[styles.primaryBtn, { backgroundColor: color }]} onPress={collect}>
                <Text style={styles.primaryBtnText}>
                  {pending.length > 0 ? `Abrir próximo (${pending.length})` : 'Pegar!'}
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.modalTitle}>{kindLabel}</Text>
              <Text style={styles.modalSubtitle}>
                {pending.length > 1 ? `Você tem ${pending.length} baús para abrir` : 'Toque para abrir'}
              </Text>
              <Pressable onPress={phase === 'closed' ? open : undefined} disabled={phase !== 'closed'}>
                <Animated.Text
                  style={[
                    styles.chestEmoji,
                    {
                      transform: [
                        { rotate: shake.interpolate({ inputRange: [-1, 1], outputRange: ['-12deg', '12deg'] }) },
                        { scale: shake.interpolate({ inputRange: [-1, 0, 1], outputRange: [1.1, 1, 1.1] }) },
                      ],
                    },
                  ]}
                >
                  🎁
                </Animated.Text>
              </Pressable>
              {phase === 'error' ? (
                <Text style={styles.errorText}>Sem conexão. Tente abrir de novo em instantes.</Text>
              ) : null}
              <Pressable
                style={[styles.primaryBtn, phase === 'shaking' && styles.btnDisabled]}
                onPress={phase === 'shaking' ? undefined : open}
              >
                <Text style={styles.primaryBtnText}>{phase === 'shaking' ? 'Abrindo…' : 'Abrir baú'}</Text>
              </Pressable>
              <Pressable onPress={() => setShowOdds((v) => !v)} hitSlop={8}>
                <Text style={styles.link}>{showOdds ? 'Ocultar chances' : 'Ver chances'}</Text>
              </Pressable>
              {showOdds && (
                <View style={styles.odds}>
                  {odds.map((o) => (
                    <Text key={o.rarity} style={[styles.oddsRow, { color: RARITY_COLOR[o.rarity] }]}>
                      {RARITY_LABEL[o.rarity]} · {o.weight}% · {o.min}–{o.max} XP
                    </Text>
                  ))}
                  <Text style={styles.oddsNote}>XP de baú não conta no ranking semanal.</Text>
                </View>
              )}
              <Pressable onPress={onClose} hitSlop={8} disabled={phase === 'shaking'}>
                <Text style={styles.secondaryLink}>Depois</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

function CelebrationModal({ item, onClose }: { item: Exclude<ModalItem, { type: 'chest' }>; onClose: () => void }) {
  const pop = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(pop, { toValue: 1, friction: 4, useNativeDriver: USE_NATIVE }).start();
    if (item.type === 'level') juice.levelUp();
    else juice.achievement();
  }, [item, pop]);

  const color = item.type === 'level' ? colors.accent[500] : RARITY_COLOR[item.achievement.rarity];

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={styles.modalCard}>
          <Burst color={color} trigger={1} />
          <Text style={[styles.rarity, { color }]}>
            {item.type === 'level' ? 'SUBIU DE NÍVEL!' : `CONQUISTA ${RARITY_LABEL[item.achievement.rarity].toUpperCase()}`}
          </Text>
          <Animated.Text
            style={[styles.chestEmoji, { transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }) }] }]}
          >
            {item.type === 'level' ? '🏆' : item.achievement.icon}
          </Animated.Text>
          {item.type === 'level' ? (
            <>
              <Text style={[styles.levelNumber, { color }]}>Nível {item.level}</Text>
              <Text style={styles.modalSubtitle}>{item.title}</Text>
            </>
          ) : (
            <>
              <Text style={styles.modalTitle}>{item.achievement.title}</Text>
              <Text style={styles.modalSubtitle}>{item.achievement.description}</Text>
              <Text style={[styles.bigXp, { color, fontSize: 22 }]}>+{item.achievement.xp} XP</Text>
            </>
          )}
          <Pressable style={[styles.primaryBtn, { backgroundColor: color }]} onPress={onClose}>
            <Text style={styles.primaryBtnText}>Boa!</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

export function GamificationProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<GamificationProfile | null>(null);
  const [queue, setQueue] = useState<ModalItem[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [muted, setMutedState] = useState(false);
  const syncing = useRef(false);
  const toastId = useRef(0);

  useEffect(() => {
    loadJuicePrefs().then(setMutedState);
  }, []);

  const pushToasts = useCallback((items: Array<{ label: string; amount: number }>) => {
    if (items.length === 0) return;
    const shown = items.length > 4 ? [...items.slice(0, 3), { label: `mais ${items.length - 3} recompensas`, amount: items.slice(3).reduce((s, i) => s + i.amount, 0) }] : items;
    shown.forEach((item, i) => {
      setTimeout(() => {
        toastId.current += 1;
        setToasts((t) => [...t, { id: toastId.current, ...item }]);
        juice.xp();
      }, i * 450);
    });
  }, []);

  const enqueueCelebrations = useCallback(
    (achievements: UnlockedAchievement[], levelBefore: number, levelAfter: number, newProfile: GamificationProfile) => {
      const items: ModalItem[] = achievements.map((a) => ({ type: 'achievement', achievement: a }));
      if (levelAfter > levelBefore) items.push({ type: 'level', level: levelAfter, title: newProfile.title });
      if (items.length) setQueue((q) => [...q, ...items]);
    },
    []
  );

  const refresh = useCallback(async () => {
    try {
      setProfile(await gamificationService.getProfile());
    } catch {}
  }, []);

  const sync = useCallback(async () => {
    if (syncing.current) return;
    syncing.current = true;
    try {
      const result = await gamificationService.sync();
      setProfile(result.profile);
      pushToasts(
        result.gained
          .filter((g) => g.source !== 'ACHIEVEMENT')
          .map((g) => ({ label: g.label, amount: g.amount }))
      );
      enqueueCelebrations(result.newAchievements, result.levelBefore, result.levelAfter, result.profile);
      if (result.newChests > 0) setQueue((q) => (q.some((i) => i.type === 'chest') ? q : [...q, { type: 'chest' }]));
    } catch {
      // Sem internet ou migration pendente: gamificação some, o trabalho continua.
    } finally {
      syncing.current = false;
    }
  }, [enqueueCelebrations, pushToasts]);

  useEffect(() => {
    const unsubscribe = offlineSyncService.addListener((event) => {
      if (event.type === 'complete' && (event.synced || 0) > 0) void sync();
    });
    return unsubscribe;
  }, [sync]);

  const openChests = useCallback(() => {
    setQueue((q) => (q.some((i) => i.type === 'chest') ? q : [{ type: 'chest' }, ...q]));
  }, []);

  const setMuted = useCallback((value: boolean) => {
    setMutedState(value);
    void setJuiceMuted(value);
  }, []);

  const current = queue[0];
  const closeCurrent = useCallback(() => setQueue((q) => q.slice(1)), []);
  const removeToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  return (
    <GamificationContext.Provider value={{ profile, sync, refresh, openChests, muted: muted || isJuiceMuted(), setMuted }}>
      <View style={styles.root}>
        {children}
        <View pointerEvents="none" style={styles.toastLayer}>
          {toasts.map((t) => (
            <XpToast key={t.id} toast={t} onDone={removeToast} />
          ))}
        </View>
      </View>
      {current?.type === 'chest' ? (
        <ChestModal
          profile={profile}
          onClose={closeCurrent}
          onOpened={(result) => {
            setProfile(result.profile);
            enqueueCelebrations(result.newAchievements, result.levelBefore, result.levelAfter, result.profile);
          }}
        />
      ) : current ? (
        <CelebrationModal item={current} onClose={closeCurrent} />
      ) : null}
    </GamificationContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0 },
  toastLayer: {
    position: 'absolute',
    top: 70,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 8,
    zIndex: 1000,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: '90%',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: colors.dark.cardElevated,
    borderWidth: 1.5,
    borderColor: colors.accent[500],
    ...theme.shadows.accent,
  },
  toastAmount: { color: colors.accent[400], fontWeight: '800', fontSize: 16 },
  toastLabel: { color: colors.text.primary, fontSize: 13, flexShrink: 1 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(8, 5, 18, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    padding: 24,
    borderRadius: 24,
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.dark.borderLight,
    overflow: 'visible',
  },
  modalTitle: { color: colors.text.primary, fontSize: 22, fontWeight: '800', textAlign: 'center' },
  modalSubtitle: { color: colors.text.secondary, fontSize: 14, textAlign: 'center', marginTop: 4 },
  rarity: { fontSize: 14, fontWeight: '800', letterSpacing: 2 },
  chestEmoji: { fontSize: 96, marginVertical: 16, textAlign: 'center' },
  bigXp: { fontSize: 36, fontWeight: '900', marginBottom: 12 },
  levelNumber: { fontSize: 40, fontWeight: '900' },
  primaryBtn: {
    marginTop: 12,
    alignSelf: 'stretch',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: colors.primary[600],
  },
  btnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: colors.white, fontWeight: '800', fontSize: 16 },
  link: { color: colors.primary[300], marginTop: 12, fontSize: 13, fontWeight: '600' },
  secondaryLink: { color: colors.text.tertiary, marginTop: 12, fontSize: 13 },
  errorText: { color: colors.error, marginTop: 4, textAlign: 'center' },
  odds: { marginTop: 8, alignItems: 'center', gap: 2 },
  oddsRow: { fontSize: 13, fontWeight: '700' },
  oddsNote: { color: colors.text.tertiary, fontSize: 11, marginTop: 4 },
  burstPiece: { position: 'absolute', top: '40%', left: '47%', fontSize: 26 },
});
