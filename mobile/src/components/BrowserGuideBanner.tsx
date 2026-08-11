import React, { useEffect, useMemo, useState } from 'react';
import { Platform, View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { colors, theme } from '../styles/theme';
import {
  detectWebBrowser,
  getBrowserDisplayName,
  isRecommendedBrowser,
  isStandalonePwa,
  openAppInChrome,
} from '../utils/browserHelper';

const DISMISS_KEY = 'promotor_browser_guide_dismissed_v1';

/**
 * Aviso para quem abre o app no Internet Samsung / outro navegador.
 * Linguagem simples: muitos promotores não sabem o que é "navegador".
 */
export default function BrowserGuideBanner() {
  const [dismissed, setDismissed] = useState(true);
  const [ready, setReady] = useState(false);

  const browser = useMemo(() => detectWebBrowser(), []);
  const needsGuide = Platform.OS === 'web' && !isRecommendedBrowser() && !isStandalonePwa();

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      setReady(true);
      return;
    }
    try {
      setDismissed(sessionStorage.getItem(DISMISS_KEY) === '1');
    } catch {
      setDismissed(false);
    }
    setReady(true);
  }, []);

  if (!ready || !needsGuide || dismissed) {
    return null;
  }

  const name = getBrowserDisplayName(browser);

  function dismiss() {
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
    setDismissed(true);
  }

  async function openChrome() {
    await openAppInChrome();
  }

  async function openPlayStoreChrome() {
    const storeUrl = 'https://play.google.com/store/apps/details?id=com.android.chrome';
    try {
      await Linking.openURL(storeUrl);
    } catch {
      if (typeof window !== 'undefined') window.open(storeUrl, '_blank');
    }
  }

  return (
    <View style={styles.banner} accessibilityRole="summary">
      <View style={styles.textWrap}>
        <Text style={styles.title}>Abra no Chrome para funcionar melhor</Text>
        <Text style={styles.subtitle}>
          Você está no {name}. GPS e câmera falham com frequência aqui. Use o app{' '}
          <Text style={styles.em}>Chrome</Text> (ícone colorido redondo).
        </Text>
        <View style={styles.steps}>
          <Text style={styles.step}>1. Toque em &quot;Abrir no Chrome&quot;</Text>
          <Text style={styles.step}>2. Se pedir, toque em Permitir localização e câmera</Text>
          <Text style={styles.step}>3. (Opcional) Menu ⋮ → Instalar app / Adicionar à tela inicial</Text>
        </View>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => void openChrome()}>
          <Text style={styles.primaryText}>Abrir no Chrome</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => void openPlayStoreChrome()}>
          <Text style={styles.secondaryText}>Não tenho Chrome</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={dismiss} hitSlop={8}>
          <Text style={styles.dismiss}>Agora não</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: 'rgba(245, 158, 11, 0.14)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245, 158, 11, 0.35)',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  textWrap: { gap: 4 },
  title: {
    color: colors.text.primary,
    fontWeight: theme.typography.fontWeight.bold,
    fontSize: theme.typography.fontSize.base,
  },
  subtitle: {
    color: colors.text.secondary,
    fontSize: theme.typography.fontSize.sm,
    lineHeight: 20,
  },
  em: {
    color: colors.text.primary,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  steps: {
    marginTop: theme.spacing.xs,
    gap: 2,
  },
  step: {
    color: colors.text.secondary,
    fontSize: theme.typography.fontSize.xs,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  primaryBtn: {
    backgroundColor: colors.primary[600],
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    minHeight: 44,
    justifyContent: 'center',
  },
  primaryText: {
    color: '#fff',
    fontWeight: theme.typography.fontWeight.semibold,
    fontSize: theme.typography.fontSize.sm,
  },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: colors.dark.border,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    minHeight: 44,
    justifyContent: 'center',
  },
  secondaryText: {
    color: colors.text.primary,
    fontSize: theme.typography.fontSize.sm,
  },
  dismiss: {
    color: colors.text.tertiary,
    fontSize: theme.typography.fontSize.sm,
    paddingHorizontal: theme.spacing.xs,
  },
});
