import React, { useEffect, useState } from 'react';
import { Platform, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, theme } from '../styles/theme';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPwaBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const handler = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (Platform.OS !== 'web' || dismissed || !deferredPrompt) {
    return null;
  }

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  }

  return (
    <View style={styles.banner}>
      <View style={styles.textWrap}>
        <Text style={styles.title}>Instale o app</Text>
        <Text style={styles.subtitle}>Acesso rápido como no celular, direto da tela inicial.</Text>
      </View>
      <TouchableOpacity style={styles.installBtn} onPress={handleInstall}>
        <Text style={styles.installText}>Instalar</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setDismissed(true)} hitSlop={8}>
        <Text style={styles.dismiss}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: colors.dark.backgroundSecondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  textWrap: { flex: 1 },
  title: {
    color: colors.text.primary,
    fontWeight: theme.typography.fontWeight.semibold,
    fontSize: theme.typography.fontSize.sm,
  },
  subtitle: {
    color: colors.text.secondary,
    fontSize: theme.typography.fontSize.xs,
    marginTop: 2,
  },
  installBtn: {
    backgroundColor: colors.primary[600],
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    minHeight: 44,
    justifyContent: 'center',
  },
  installText: {
    color: '#fff',
    fontWeight: theme.typography.fontWeight.semibold,
    fontSize: theme.typography.fontSize.sm,
  },
  dismiss: {
    color: colors.text.tertiary,
    fontSize: 18,
    paddingHorizontal: theme.spacing.xs,
  },
});
