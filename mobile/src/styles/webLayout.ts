import { Platform, ViewStyle } from 'react-native';
import type { EdgeInsets } from 'react-native-safe-area-context';
import { theme } from './theme';

const NATIVE_TAB_BAR_MIN_BOTTOM = theme.spacing.sm;

/** Container de tela — flex com minHeight 0 para scroll aninhado na web. */
export const screenContainer: ViewStyle = Platform.select({
  web: { flex: 1, minHeight: 0, height: '100%' },
  default: { flex: 1 },
}) as ViewStyle;

/** ScrollView / FlatList — precisa de altura limitada para rolar na web. */
export const flexScroll: ViewStyle = Platform.select({
  web: {
    flex: 1,
    minHeight: 0,
    overflow: 'auto',
    WebkitOverflowScrolling: 'touch',
  },
  default: { flex: 1 },
}) as ViewStyle;

/** Opções de navegação com altura correta na web. */
export const navigationSceneStyle: ViewStyle = Platform.select({
  web: { flex: 1, minHeight: 0, height: '100%' },
  default: { flex: 1 },
}) as ViewStyle;

/** Insets da tab bar: mínimo no native para não colar nos botões/gestos do sistema. */
export function getTabBarSafeAreaInsets(insets: EdgeInsets): EdgeInsets {
  if (Platform.OS === 'web') {
    return insets;
  }
  return {
    ...insets,
    bottom: Math.max(insets.bottom, NATIVE_TAB_BAR_MIN_BOTTOM),
  };
}

export const WEB_SCROLL_CSS = `
  html, body {
    height: 100%;
    margin: 0;
    overflow: hidden;
    overscroll-behavior: none;
  }
  #root {
    display: flex;
    flex-direction: column;
    flex: 1;
    height: 100%;
    min-height: 0;
  }
  #root > div {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    height: 100%;
  }
`;

export function injectWebScrollCss(): void {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  if (document.getElementById('pwa-scroll-fix')) return;
  const style = document.createElement('style');
  style.id = 'pwa-scroll-fix';
  style.textContent = WEB_SCROLL_CSS;
  document.head.appendChild(style);
}
