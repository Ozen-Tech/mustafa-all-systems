import { AppRegistry, Platform } from 'react-native';

console.log('📱 index.js iniciado - linha 1');

if (Platform.OS === 'web' && typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('SW registration failed:', err);
    });
  });
}

// Suprimir erro DETECT_SCREEN_CAPTURE (não é crítico, apenas um aviso do Android)
if (__DEV__) {
  const originalError = console.error;
  console.error = (...args) => {
    const errorMessage = args[0]?.toString() || '';
    if (errorMessage.includes('DETECT_SCREEN_CAPTURE') || 
        errorMessage.includes('registerScreenCaptureObserver')) {
      // Ignorar silenciosamente ou logar como aviso
      console.warn('⚠️ Aviso de permissão DETECT_SCREEN_CAPTURE (pode ser ignorado)');
      return;
    }
    originalError(...args);
  };
}

// Importar App com tratamento de erro
let App;
try {
  console.log('📦 Tentando importar App.tsx...');
  App = require('./App').default;
  console.log('✅ App importado com sucesso, tipo:', typeof App);
  if (!App) {
    throw new Error('App é undefined ou null');
  }
} catch (err) {
  const errorMessage = err?.message || err?.toString() || 'Erro desconhecido';
  const errorStack = err?.stack || 'Sem stack trace';
  
  console.error('❌ ERRO CRÍTICO ao importar App:', err);
  console.error('❌ Mensagem:', errorMessage);
  console.error('❌ Stack:', errorStack);
  
  // Componente de erro inline
  const React = require('react');
  const { View, Text, ScrollView } = require('react-native');
  App = () => {
    return React.createElement(
      ScrollView,
      { style: { flex: 1, padding: 20, backgroundColor: '#fff' } },
      React.createElement(Text, { style: { fontSize: 20, fontWeight: 'bold', color: '#f00', marginBottom: 10 } }, '❌ Erro ao carregar App'),
      React.createElement(Text, { style: { fontSize: 14, color: '#666', marginBottom: 5 } }, `Erro: ${errorMessage}`),
      React.createElement(Text, { style: { fontSize: 12, color: '#999', marginTop: 10 } }, 'Verifique o console do Metro para mais detalhes')
    );
  };
}

console.log('📝 Preparando para registrar componente...');

// Registrar o componente principal com o nome 'main'
try {
  AppRegistry.registerComponent('main', () => {
    console.log('✅ Wrapper do componente executado');
    return App;
  });
  console.log('✅ AppRegistry.registerComponent chamado com SUCESSO');
} catch (err) {
  const errorMessage = err?.message || err?.toString() || 'Erro desconhecido';
  const errorStack = err?.stack || 'Sem stack trace';
  console.error('❌ ERRO ao registrar componente:', err);
  console.error('❌ Mensagem:', errorMessage);
  console.error('❌ Stack:', errorStack);
  throw err; // Re-lançar para ver o erro completo
}

console.log('✅ index.js concluído com sucesso');
