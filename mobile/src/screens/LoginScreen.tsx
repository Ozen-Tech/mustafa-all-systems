import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, Image, ScrollView } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { colors, theme } from '../styles/theme';
import { flexScroll } from '../styles/webLayout';
import { layout, screenStyles } from '../styles/layout';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import ScreenHeader from '../components/ui/ScreenHeader';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert('Erro', 'Preencha todos os campos');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
    } catch (error: any) {
      let errorMessage = 'Erro ao fazer login';

      if (error.response) {
        errorMessage =
          error.response.data?.message ||
          `Erro ${error.response.status}: ${error.response.statusText}`;
      } else if (error.request) {
        errorMessage =
          'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.';
      } else {
        errorMessage = error.message || 'Erro desconhecido';
      }

      Alert.alert('Erro no Login', errorMessage);
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
        <Input
          label="Senha"
          placeholder="Sua senha"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Button variant="primary" size="lg" isLoading={loading} onPress={handleLogin} style={styles.button}>
          Entrar
        </Button>
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
  button: {
    marginTop: theme.spacing.sm,
    width: '100%',
  },
  footer: {
    marginTop: theme.spacing['2xl'],
    textAlign: 'center',
    fontSize: theme.typography.fontSize.xs,
    color: colors.text.tertiary,
  },
});
