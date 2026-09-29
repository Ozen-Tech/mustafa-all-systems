import React, { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useGamification } from '../features/gamification/GamificationProvider';
import { RARITY_COLOR, RARITY_LABEL } from '../services/gamificationService';
import LevelCard from '../components/gamification/LevelCard';
import { colors, theme } from '../styles/theme';
import { flexScroll } from '../styles/webLayout';

export default function AchievementsScreen() {
  const { profile, refresh, muted, setMuted } = useGamification();
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  const achievements = profile?.achievements || [];
  const unlocked = achievements.filter((a) => a.unlockedAt);
  const locked = achievements.filter((a) => !a.unlockedAt);

  return (
    <ScrollView
      style={[styles.container, flexScroll]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await refresh();
            setRefreshing(false);
          }}
          tintColor={colors.primary[500]}
        />
      }
    >
      <LevelCard onOpenAchievements={() => {}} />

      <Text style={styles.sectionTitle}>
        Conquistas · {unlocked.length}/{achievements.length}
      </Text>
      <View style={styles.grid}>
        {[...unlocked, ...locked].map((a) => {
          const isUnlocked = !!a.unlockedAt;
          const color = RARITY_COLOR[a.rarity];
          const pct = a.progress ? a.progress.value / a.progress.target : 0;
          return (
            <View
              key={a.code}
              style={[styles.medal, isUnlocked ? { borderColor: color } : styles.medalLocked]}
            >
              <Text style={[styles.medalIcon, !isUnlocked && styles.iconLocked]}>{a.icon}</Text>
              <Text style={styles.medalTitle} numberOfLines={1}>
                {a.title}
              </Text>
              <Text style={styles.medalDesc} numberOfLines={2}>
                {a.description}
              </Text>
              {isUnlocked ? (
                <Text style={[styles.medalRarity, { color }]}>
                  {RARITY_LABEL[a.rarity]} · +{a.xp} XP
                </Text>
              ) : a.progress ? (
                <>
                  <View style={styles.progressBg}>
                    <View style={[styles.progressFill, { width: `${Math.round(pct * 100)}%` as any, backgroundColor: color }]} />
                  </View>
                  <Text style={styles.progressText}>
                    {a.progress.value}/{a.progress.target}
                  </Text>
                </>
              ) : (
                <Text style={styles.progressText}>+{a.xp} XP</Text>
              )}
            </View>
          );
        })}
      </View>

      <Text style={styles.sectionTitle}>Como ganhar XP</Text>
      <View style={styles.rules}>
        {[
          ['🏪', 'Loja concluída', '+30'],
          ['⚡', 'Cada indústria com foto (combo até x2)', '+5 a +10'],
          ['⏰', 'Primeira evidência até 20h', '+15'],
          ['📸', 'Cota de fotos do dia', '+10'],
          ['✅', 'Dia fechado (rota inteira resolvida)', '+40'],
          ['🏷️', 'Pesquisa de preço', '+3'],
          ['🆕', 'Produto que ninguém pesquisou na semana', '+5'],
          ['🎁', 'Baú da loja e baú do dia', 'surpresa'],
        ].map(([icon, label, xp]) => (
          <View key={label} style={styles.ruleRow}>
            <Text style={styles.ruleIcon}>{icon}</Text>
            <Text style={styles.ruleLabel}>{label}</Text>
            <Text style={styles.ruleXp}>{xp}</Text>
          </View>
        ))}
        <Text style={styles.ruleNote}>
          XP é o seu progresso pessoal. O ranking semanal continua contando só os pontos do trabalho, sem sorte.
        </Text>
      </View>

      {profile?.recent?.length ? (
        <>
          <Text style={styles.sectionTitle}>Últimas recompensas</Text>
          <View style={styles.rules}>
            {profile.recent.map((r, i) => (
              <View key={i} style={styles.ruleRow}>
                <Text style={styles.ruleLabel} numberOfLines={1}>
                  {r.label}
                </Text>
                <Text style={styles.ruleXp}>+{r.amount}</Text>
              </View>
            ))}
          </View>
        </>
      ) : null}

      <Pressable style={styles.soundRow} onPress={() => setMuted(!muted)}>
        <Text style={styles.soundLabel}>🔊 Sons e vibração</Text>
        <Switch value={!muted} onValueChange={(v) => setMuted(!v)} />
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark.background },
  content: { padding: theme.spacing.md, paddingBottom: theme.spacing.xl * 2, gap: theme.spacing.md },
  sectionTitle: { color: colors.text.primary, fontSize: 17, fontWeight: '800', marginTop: theme.spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  medal: {
    width: '48%',
    flexGrow: 1,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1.5,
    backgroundColor: colors.dark.card,
    alignItems: 'center',
  },
  medalLocked: { borderColor: colors.dark.border, opacity: 0.75 },
  medalIcon: { fontSize: 36 },
  iconLocked: { opacity: 0.35 },
  medalTitle: { color: colors.text.primary, fontWeight: '800', marginTop: 6, textAlign: 'center' },
  medalDesc: { color: colors.text.tertiary, fontSize: 11, textAlign: 'center', marginTop: 2, minHeight: 28 },
  medalRarity: { fontSize: 11, fontWeight: '800', marginTop: 6 },
  progressBg: {
    alignSelf: 'stretch',
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.dark.backgroundSecondary,
    overflow: 'hidden',
    marginTop: 8,
  },
  progressFill: { height: '100%', borderRadius: 3 },
  progressText: { color: colors.text.tertiary, fontSize: 11, marginTop: 4 },
  rules: {
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.dark.border,
    gap: 10,
  },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ruleIcon: { fontSize: 18, width: 24, textAlign: 'center' },
  ruleLabel: { flex: 1, color: colors.text.secondary, fontSize: 13 },
  ruleXp: { color: colors.accent[400], fontWeight: '800', fontSize: 13 },
  ruleNote: { color: colors.text.tertiary, fontSize: 11, marginTop: 4 },
  soundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  soundLabel: { color: colors.text.primary, fontWeight: '700' },
});
