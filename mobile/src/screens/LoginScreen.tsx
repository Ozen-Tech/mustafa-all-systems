import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { colors, theme } from '../styles/theme';
import { flexScroll } from '../styles/webLayout';
import { layout, screenStyles } from '../styles/layout';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import ScreenHeader from '../components/ui/ScreenHeader';
import { showAlert } from '../utils/alertHelper';
import {
  isRecommendedBrowser,
  openAppInChrome,
} from '../utils/browserHelper';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const showBrowserTip = typeof navigator !== 'undefined' && !isRecommendedBrowser();

  async function handleLogin() {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      showAlert('Erro', 'Preencha todos os campos');
      return;
    }

    setLoading(true);
    try {
      await login(trimmedEmail, trimmedPassword);
    } catch (error: any) {
      let errorMessage = 'Erro ao fazer login';

      if (error.code === 'ECONNABORTED' || error.message?.toLowerCase?.().includes('timeout')) {
        errorMessage =
          'A conexão demorou demais. Verifique a internet (Wi‑Fi ou dados) e tente novamente.';
      } else if (error.response) {
        errorMessage =
          error.response.data?.message ||
          `Erro ${error.response.status}: ${error.response.statusText}`;
      } else if (error.request) {
        errorMessage =
          'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.';
      } else {
        errorMessage = error.message || 'Erro desconhecido';
      }

      showAlert('Erro no Login', errorMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView
      style={[screenStyles.root, flexScroll]}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.brandBlock}>
        <View style={styles.logoCircle}>
          <Image
            source={require('../../assets/images/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>
        <ScreenHeader
          align="center"
          eyebrow="Promo Gestão"
          title="Bem-vindo de volta"
          subtitle="Entre com suas credenciais para acessar suas rotas e visitas"
        />
      </View>

      <View style={styles.form}>
        <Input
          label="Email"
          placeholder="seu@email.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <View>
          <Input
            label="Senha"
            placeholder="Sua senha"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.passwordInput}
          />
          <TouchableOpacity
            style={styles.showPasswordBtn}
            onPress={() => setShowPassword((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
          >
            <Text style={styles.showPasswordText}>{showPassword ? 'Ocultar' : 'Mostrar'}</Text>
          </TouchableOpacity>
        </View>
        <Button
          variant="primary"
          size="lg"
          isLoading={loading}
          onPress={handleLogin}
          style={styles.button}
        >
          Entrar
        </Button>
        {showBrowserTip ? (
          <TouchableOpacity style={styles.browserTip} onPress={() => void openAppInChrome()}>
            <Text style={styles.browserTipTitle}>GPS ou câmera não funciona?</Text>
            <Text style={styles.browserTipText}>
              Toque aqui para abrir no Chrome (ícone colorido). No Internet Samsung as permissões
              costumam falhar.
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <Text style={styles.footer}>Versão do app · Promo Gestão</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: layout.screenPaddingHorizontal,
    paddingVertical: theme.spacing['2xl'],
    justifyContent: 'center',
  },
  brandBlock: {
    alignItems: 'center',
    marginBottom: theme.spacing['2xl'],
  },
  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: theme.borderRadius['2xl'],
    backgroundColor: colors.dark.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary[700],
    ...theme.shadows.primary,
    padding: theme.spacing.sm,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  form: {
    gap: theme.spacing.lg,
  },
  passwordInput: {
    paddingRight: 88,
  },
  showPasswordBtn: {
    position: 'absolute',
    right: theme.spacing.md,
    bottom: theme.spacing.md + 2,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
  },
  showPasswordText: {
    color: colors.primary[400],
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  button: {
    marginTop: theme.spacing.sm,
    width: '100%',
  },
  browserTip: {
    marginTop: theme.spacing.sm,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
  },
  browserTipTitle: {
    color: colors.text.primary,
    fontWeight: theme.typography.fontWeight.semibold,
    fontSize: theme.typography.fontSize.sm,
    marginBottom: 4,
  },
  browserTipText: {
    color: colors.text.secondary,
    fontSize: theme.typography.fontSize.xs,
    lineHeight: 18,
  },
  footer: {
    marginTop: theme.spacing['2xl'],
    textAlign: 'center',
    fontSize: theme.typography.fontSize.xs,
    color: colors.text.tertiary,
  },
});
