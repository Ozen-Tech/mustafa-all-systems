import { Alert, Platform } from 'react-native';

export type AlertButton = {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};

/**
 * Alert compatível com web. Alert.alert do RN não dispara onPress dos botões no browser.
 */
export function showAlert(
  title: string,
  message?: string,
  buttons?: AlertButton[]
): void {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons);
    return;
  }

  const body = [title, message].filter(Boolean).join('\n\n');

  if (!buttons?.length) {
    window.alert(body || title);
    return;
  }

  if (buttons.length === 1) {
    window.alert(body);
    buttons[0].onPress?.();
    return;
  }

  const cancelBtn = buttons.find((b) => b.style === 'cancel');
  const actionBtns = buttons.filter((b) => b.style !== 'cancel');
  const primaryBtn = actionBtns.find((b) => b.style !== 'destructive') ?? actionBtns[0];

  if (cancelBtn && actionBtns.length === 1) {
    const confirmed = window.confirm(body);
    if (confirmed) {
      primaryBtn?.onPress?.();
    } else {
      cancelBtn.onPress?.();
    }
    return;
  }

  window.alert(body);
  primaryBtn?.onPress?.();
}
