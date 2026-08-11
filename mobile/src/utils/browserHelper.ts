import { Platform, Linking } from 'react-native';

export type WebBrowserKind =
  | 'chrome'
  | 'samsung'
  | 'firefox'
  | 'edge'
  | 'opera'
  | 'safari'
  | 'inapp'
  | 'other';

const APP_URL = 'https://promotor-mustafabucket.web.app';

function getUserAgent(): string {
  if (typeof navigator === 'undefined') return '';
  return navigator.userAgent || '';
}

/** App instalado na tela inicial (PWA standalone). */
export function isStandalonePwa(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  try {
    const mq = window.matchMedia?.('(display-mode: standalone)')?.matches;
    const iosStandalone = (navigator as any).standalone === true;
    return !!(mq || iosStandalone);
  } catch {
    return false;
  }
}

export function detectWebBrowser(): WebBrowserKind {
  if (Platform.OS !== 'web') return 'other';
  const uaLower = getUserAgent().toLowerCase();

  // WebViews / navegadores embutidos (WhatsApp, Instagram, Facebook…)
  if (
    uaLower.includes('fbav') ||
    uaLower.includes('fban') ||
    uaLower.includes('instagram') ||
    uaLower.includes('whatsapp') ||
    uaLower.includes('; wv)')
  ) {
    return 'inapp';
  }

  if (uaLower.includes('samsungbrowser')) return 'samsung';
  if (uaLower.includes('fxios') || (uaLower.includes('firefox') && !uaLower.includes('seamonkey'))) {
    return 'firefox';
  }
  if (uaLower.includes('edg/') || uaLower.includes('edgios') || uaLower.includes('edga')) {
    return 'edge';
  }
  if (uaLower.includes('opr/') || uaLower.includes('opera')) return 'opera';
  if (uaLower.includes('crios') || (uaLower.includes('chrome') && !uaLower.includes('edg'))) {
    return 'chrome';
  }
  if (uaLower.includes('safari') && !uaLower.includes('chrome')) return 'safari';
  return 'other';
}

export function isRecommendedBrowser(): boolean {
  const kind = detectWebBrowser();
  return kind === 'chrome' || isStandalonePwa();
}

export function getBrowserDisplayName(kind: WebBrowserKind = detectWebBrowser()): string {
  switch (kind) {
    case 'chrome':
      return 'Chrome';
    case 'samsung':
      return 'Internet Samsung';
    case 'firefox':
      return 'Firefox';
    case 'edge':
      return 'Edge';
    case 'opera':
      return 'Opera';
    case 'safari':
      return 'Safari';
    case 'inapp':
      return 'navegador do app (WhatsApp/Instagram)';
    default:
      return 'este navegador';
  }
}

/**
 * Abre o site no Chrome Android (melhor suporte a GPS/câmera/PWA).
 * Se o Chrome não estiver instalado, cai no link da Play Store.
 */
export async function openAppInChrome(url: string = APP_URL): Promise<void> {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;

  const encoded = encodeURIComponent(url);
  const intentUrl =
    `intent://${url.replace(/^https?:\/\//, '')}` +
    `#Intent;scheme=https;package=com.android.chrome;` +
    `S.browser_fallback_url=${encoded};end`;

  try {
    window.location.href = intentUrl;
  } catch {
    try {
      await Linking.openURL(`googlechrome://navigate?url=${encoded}`);
    } catch {
      window.open(url, '_blank');
    }
  }
}

export function getLocationPermissionHelpMessageForBrowser(
  kind: WebBrowserKind = detectWebBrowser()
): string {
  if (Platform.OS !== 'web') {
    return 'Permita o acesso à localização nas configurações do aparelho para usar check-in e checkout.';
  }

  if (kind === 'samsung') {
    return [
      'O app precisa da sua localização para o check-in.',
      '',
      'No Internet Samsung:',
      '1. Toque no cadeado ou escudo ao lado do endereço',
      '2. Permissões → Localização → Permitir',
      '3. Ou: menu ☰ → Configurações → Sites e downloads → Gerenciar permissões do site',
      '4. Deixe a Localização do celular ligada (Ajustes do aparelho)',
      '',
      'Dica: se continuar falhando, abra este app no Chrome (ícone colorido).',
    ].join('\n');
  }

  if (kind === 'inapp') {
    return [
      'Você abriu o link dentro de outro app (WhatsApp, Instagram, etc.).',
      '',
      'Isso bloqueia GPS e câmera com frequência.',
      '',
      'Faça assim:',
      '1. Toque nos 3 pontinhos do navegador interno',
      '2. Escolha "Abrir no Chrome" ou "Abrir no navegador"',
      '3. Depois permita Localização e Câmera',
    ].join('\n');
  }

  return [
    'O app precisa da sua localização para o check-in.',
    '',
    'No celular (Chrome):',
    '1. Toque no cadeado (ou ⓘ) ao lado do endereço do site',
    '2. Em Localização, escolha Permitir',
    '3. Se não aparecer: menu ⋮ → Configurações → Configurações do site → Localização → Permitir',
    '4. Confira se a Localização do celular está ligada (Ajustes do aparelho)',
    '',
    'Depois toque em OK e tente de novo. Se ainda falhar, recarregue a página.',
  ].join('\n');
}
