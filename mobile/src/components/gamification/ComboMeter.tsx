import React, { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';
import { juice } from '../../utils/juice';
import { colors, theme } from '../../styles/theme';

const USE_NATIVE = Platform.OS !== 'web';

function multiplierFor(count: number): number {
  if (count >= 5) return 2;
  if (count >= 3) return 1.5;
  return 1;
}

/** Mesma regra do backend (comboXp): 5 XP por indústria, x1.5 a partir da 3ª, x2 a partir da 5ª. */
function comboXp(count: number): number {
  let total = 0;
  for (let i = 1; i <= count; i++) total += Math.round(5 * multiplierFor(i));
  return total;
}

export default function ComboMeter({ covered, total }: { covered: number; total: number }) {
  const scale = useRef(new Animated.Value(1)).current;
  const previous = useRef(covered);
  const mult = multiplierFor(covered);

  useEffect(() => {
    if (covered > previous.current) {
      const crossed = multiplierFor(covered) > multiplierFor(previous.current);
      if (crossed) juice.combo(covered >= 5 ? 2 : 1);
      else juice.xp();
      scale.setValue(1.25);
      Animated.spring(scale, { toValue: 1, friction: 3, useNativeDriver: USE_NATIVE }).start();
    }
    previous.current = covered;
  }, [covered, scale]);

  if (total === 0) return null;

  const nextTarget = covered < 3 ? 3 : covered < 5 ? 5 : null;
  const color = mult >= 2 ? colors.accent[500] : mult > 1 ? colors.primary[400] : colors.text.tertiary;

  return (
    <View style={[styles.card, { borderColor: color }]}>
      <Animated.View style={[styles.multBox, { borderColor: color, transform: [{ scale }] }]}>
        <Text style={[styles.mult, { color }]}>x{mult}</Text>
        <Text style={styles.multLabel}>COMBO</Text>
      </Animated.View>
      <View style={styles.info}>
        <Text style={styles.title}>
          {covered}/{total} indústrias com foto · +{comboXp(covered)} XP
        </Text>
        <View style={styles.dots}>
          {Array.from({ length: total }, (_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i < covered && { backgroundColor: i >= 4 ? colors.accent[500] : i >= 2 ? colors.primary[400] : colors.success },
              ]}
            />
          ))}
        </View>
        <Text style={styles.hint}>
          {nextTarget
            ? `Mais ${nextTarget - covered} indústria(s) para o combo x${nextTarget === 3 ? '1.5' : '2'}`
            : covered === total
              ? 'Loja completa! Faça o checkout para abrir o baú 🎁'
              : 'Combo máximo! Cada indústria vale o dobro'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1.5,
    backgroundColor: colors.dark.card,
  },
  multBox: {
    width: 64,
    height: 64,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dark.backgroundSecondary,
  },
  mult: { fontSize: 24, fontWeight: '900' },
  multLabel: { color: colors.text.tertiary, fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  info: { flex: 1, minWidth: 0 },
  title: { color: colors.text.primary, fontWeight: '700', fontSize: 14 },
  dots: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  dot: { width: 14, height: 14, borderRadius: 7, backgroundColor: colors.dark.border },
  hint: { color: colors.text.tertiary, fontSize: 12, marginTop: 6 },
});
