import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { colors, theme } from '../styles/theme';
import HomeScreen from '../screens/HomeScreen';
import HistoryScreen from '../screens/HistoryScreen';
import ProfileScreen from '../screens/ProfileScreen';
import HomeIcon from '../components/icons/HomeIcon';
import ClockIcon from '../components/icons/ClockIcon';
import UserIcon from '../components/icons/UserIcon';

// Componente de loading/erro
function LoadingScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" />
      <Text style={{ marginTop: 10 }}>Carregando...</Text>
    </View>
  );
}

// Wrappers que carregam apenas quando a tela é realmente renderizada
// Metro bundler não suporta require() dinâmico, então precisamos usar require() estático
// StoresScreen também precisa de lazy loading pois usa expo-location (import estático causa erro na inicialização)

function StoresScreenWrapper(props: any) {
  // Sempre chamar hooks na mesma ordem
  const [Screen, setScreen] = React.useState<React.ComponentType<any> | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Usar useMemo para garantir que o módulo seja carregado de forma estável
  React.useEffect(() => {
    let mounted = true;
    const timer = setTimeout(() => {
      try {
        const module = require('../screens/IndustriesScreen');
        if (module && module.default) {
          if (mounted) {
            setScreen(() => module.default);
            setIsLoading(false);
          }
        } else {
          if (mounted) {
            setError('Módulo StoresScreen não tem export default válido');
            setIsLoading(false);
          }
        }
      } catch (err: any) {
        const errorMsg = err?.message || err?.toString() || 'Erro desconhecido';
        
        // Ignorar erros de permissão (não são críticos)
        if (errorMsg.includes('DETECT_SCREEN_CAPTURE') || 
            errorMsg.includes('NativeUnimoduleProxy') ||
            errorMsg.includes('registerScreenCaptureObserver')) {
          console.warn('⚠️ Aviso de permissão ignorado para StoresScreen:', errorMsg);
          // Tentar novamente após ignorar o erro
          try {
            const module = require('../screens/IndustriesScreen');
            if (module && module.default && mounted) {
              setScreen(() => module.default);
              setIsLoading(false);
            } else if (mounted) {
              setError('Módulo StoresScreen não tem export default válido');
              setIsLoading(false);
            }
          } catch (retryErr: any) {
            if (mounted) {
              console.error('Erro ao carregar StoresScreen após retry:', retryErr);
              setError('Erro ao carregar tela de lojas');
              setIsLoading(false);
            }
          }
        } else {
          if (mounted) {
            console.error('Erro ao carregar StoresScreen:', err);
            setError('Erro ao carregar tela de lojas');
            setIsLoading(false);
          }
        }
      }
    }, 500);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, []);

  // Sempre retornar um componente válido
  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ color: 'red', marginBottom: 10, fontSize: 16, fontWeight: 'bold' }}>
          Erro ao carregar tela
        </Text>
        <Text style={{ color: 'gray', fontSize: 12, textAlign: 'center' }}>{error}</Text>
      </View>
    );
  }

  if (isLoading || !Screen) {
    return <LoadingScreen />;
  }

  return <Screen {...props} />;
}

function CheckInScreenWrapper(props: any) {
  const [Screen, setScreen] = React.useState<React.ComponentType<any> | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const module = require('../screens/CheckInScreen');
        if (module && module.default) {
          setScreen(() => module.default);
        }
      } catch (err: any) {
        if (err?.message?.includes('DETECT_SCREEN_CAPTURE')) {
          console.warn('Aviso de permissão ignorado para CheckInScreen');
          const module = require('../screens/CheckInScreen');
          if (module && module.default) {
            setScreen(() => module.default);
          }
        }
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading || !Screen) {
    return <LoadingScreen />;
  }

  return <Screen {...props} />;
}

function ActiveVisitScreenWrapper(props: any) {
  const [Screen, setScreen] = React.useState<React.ComponentType<any> | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const module = require('../screens/ActiveVisitScreen');
        if (module && module.default) {
          setScreen(() => module.default);
        }
      } catch (err: any) {
        if (err?.message?.includes('DETECT_SCREEN_CAPTURE')) {
          console.warn('Aviso de permissão ignorado para ActiveVisitScreen');
          const module = require('../screens/ActiveVisitScreen');
          if (module && module.default) {
            setScreen(() => module.default);
          }
        }
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading || !Screen) {
    return <LoadingScreen />;
  }

  return <Screen {...props} />;
}

function CheckoutScreenWrapper(props: any) {
  const [Screen, setScreen] = React.useState<React.ComponentType<any> | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const module = require('../screens/CheckoutScreen');
        if (module && module.default) {
          setScreen(() => module.default);
        }
      } catch (err: any) {
        if (err?.message?.includes('DETECT_SCREEN_CAPTURE')) {
          console.warn('Aviso de permissão ignorado para CheckoutScreen');
          const module = require('../screens/CheckoutScreen');
          if (module && module.default) {
            setScreen(() => module.default);
          }
        }
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading || !Screen) {
    return <LoadingScreen />;
  }

  return <Screen {...props} />;
}

function PriceResearchScreenWrapper(props: any) {
  const [Screen, setScreen] = React.useState<React.ComponentType<any> | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const module = require('../screens/PriceResearchScreen');
        if (module && module.default) {
          setScreen(() => module.default);
        }
      } catch (err: any) {
        if (err?.message?.includes('DETECT_SCREEN_CAPTURE')) {
          console.warn('Aviso de permissão ignorado para PriceResearchScreen');
          const module = require('../screens/PriceResearchScreen');
          if (module && module.default) {
            setScreen(() => module.default);
          }
        }
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading || !Screen) {
    return <LoadingScreen />;
  }

  return <Screen {...props} />;
}

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: colors.dark.backgroundSecondary,
          borderTopColor: colors.dark.border,
          borderTopWidth: 1,
          paddingTop: theme.spacing.sm,
          paddingBottom: theme.spacing.sm,
          height: 60,
        },
        tabBarActiveTintColor: colors.primary[400],
        tabBarInactiveTintColor: colors.text.tertiary,
        tabBarLabelStyle: {
          fontSize: theme.typography.fontSize.xs,
          fontWeight: theme.typography.fontWeight.medium,
        },
        headerStyle: {
          backgroundColor: colors.dark.background,
          borderBottomColor: colors.dark.border,
          borderBottomWidth: 1,
        },
        headerTintColor: colors.text.primary,
        headerTitleStyle: {
          fontWeight: theme.typography.fontWeight.bold,
          fontSize: theme.typography.fontSize.lg,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Início',
          tabBarIcon: ({ color, size }) => <HomeIcon size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{
          title: 'Histórico',
          tabBarIcon: ({ color, size }) => <ClockIcon size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => <UserIcon size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

export default function MainNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.dark.background,
          borderBottomColor: colors.dark.border,
          borderBottomWidth: 1,
        },
        headerTintColor: colors.text.primary,
        headerTitleStyle: {
          fontWeight: theme.typography.fontWeight.bold,
          fontSize: theme.typography.fontSize.lg,
        },
        cardStyle: {
          backgroundColor: colors.dark.background,
        },
      }}
    >
      <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen
        name="Stores"
        component={StoresScreenWrapper}
        options={{ title: 'Selecione uma Loja' }}
      />
      <Stack.Screen
        name="CheckIn"
        component={CheckInScreenWrapper}
        options={{ title: 'Check-in' }}
      />
      <Stack.Screen
        name="ActiveVisit"
        component={ActiveVisitScreenWrapper}
        options={{ title: 'Visita em Andamento' }}
      />
      <Stack.Screen
        name="PriceResearch"
        component={PriceResearchScreenWrapper}
        options={{ title: 'Pesquisa de Preços' }}
      />
      <Stack.Screen
        name="Checkout"
        component={CheckoutScreenWrapper}
        options={{ title: 'Checkout' }}
      />
    </Stack.Navigator>
  );
}
