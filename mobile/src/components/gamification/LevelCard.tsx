import React, { useEffect, useRef } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useGamification } from '../../features/gamification/GamificationProvider';
import { colors, theme } from '../../styles/theme';

const USE_NATIVE = Platform.OS !== 'web';

export default function LevelCard({ onOpenAchievements }: { onOpenAchievements: () => void }) {
  const { profile, openChests } = useGamification();
  const bar = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const chests = profile?.pendingChests.length || 0;

  useEffect(() => {
    Animated.timing(bar, {
      toValue: profile?.progress || 0,
      duration: 700,
      useNativeDriver: false,
    }).start();
  }, [bar, profile?.progress]);

  useEffect(() => {
    if (chests === 0) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: USE_NATIVE }),
        Animated.timing(pulse, { toValue: 0, duration: 600, useNativeDriver: USE_NATIVE }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [chests, pulse]);

  if (!profile) return null;

  const unlocked = profile.achievements.filter((a) => a.unlockedAt).length;
  const toNext = profile.nextLevelXp - profile.xp;

  return (
    <View style={styles.card}>
      <Pressable onPress={onOpenAchievements} style={styles.topRow}>
        <View style={styles.levelBadge}>
          <Text style={styles.levelBadgeLabel}>NÍVEL</Text>
          <Text style={styles.levelBadgeValue}>{profile.level}</Text>
        </View>
        <View style={styles.info}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{profile.title}</Text>
            {profile.todayXp > 0 ? <Text style={styles.today}>+{profile.todayXp} XP hoje</Text> : null}
          </View>
          <View style={styles.barBg}>
            <Animated.View
              style={[
                styles.barFill,
                { width: bar.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
              ]}
            />
          </View>
          <Text style={styles.barText}>
            {profile.xp - profile.levelStartXp}/{profile.nextLevelXp - profile.levelStartXp} XP · faltam {toNext} para o
            nível {profile.level + 1}
          </Text>
        </View>
      </Pressable>

      <View style={styles.actions}>
        {chests > 0 ? (
          <Pressable onPress={openChests} style={styles.chestBtn}>
            <Animated.Text
              style={[
                styles.chestIcon,
                { transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.2] }) }] },
              ]}
            >
              🎁
            </Animated.Text>
            <Text style={styles.chestText}>
              {chests} baú{chests > 1 ? 's' : ''} para abrir
            </Text>
          </Pressable>
        ) : (
          <View style={styles.chestHint}>
            <Text style={styles.chestHintText}>🎁 Conclua uma loja para ganhar um baú</Text>
          </View>
        )}
        <Pressable onPress={onOpenAchievements} style={styles.medalBtn}>
          <Text style={styles.medalText}>🏅 {unlocked}/{profile.achievements.length}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: colors.dark.card,
    borderWidth: 1,
    borderColor: colors.primary[600] + '66',
    ...theme.shadows.primary,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  levelBadge: {
    width: 62,
    height: 62,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary[600],
    borderWidth: 2,
    borderColor: colors.accent[500],
  },
  levelBadgeLabel: { color: colors.accent[300], fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  levelBadgeValue: { color: colors.white, fontSize: 26, fontWeight: '900', lineHeight: 30 },
  info: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  title: { color: colors.text.primary, fontSize: 16, fontWeight: '800', flexShrink: 1 },
  today: { color: colors.accent[400], fontSize: 12, fontWeight: '700' },
  barBg: {
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.dark.backgroundSecondary,
    overflow: 'hidden',
    marginTop: 6,
  },
  barFill: { height: '100%', borderRadius: 5, backgroundColor: colors.accent[500] },
  barText: { color: colors.text.tertiary, fontSize: 11, marginTop: 4 },
  actions: { flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.md },
  chestBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: colors.accent[500] + '26',
    borderWidth: 1.5,
    borderColor: colors.accent[500],
  },
  chestIcon: { fontSize: 22 },
  chestText: { color: colors.accent[300], fontWeight: '800' },
  chestHint: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: colors.dark.backgroundSecondary,
  },
  chestHintText: { color: colors.text.tertiary, fontSize: 12 },
  medalBtn: {
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.dark.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  medalText: { color: colors.text.primary, fontWeight: '700' },
});
