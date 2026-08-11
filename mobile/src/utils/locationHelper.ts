/**
 * Helper centralizado para importação e uso do expo-location
 *
 * Inclui timeout obrigatório — sem isso o GPS pode travar o botão de check-in para sempre no PWA.
 */

import { Platform } from 'react-native';
import { showAlert } from './alertHelper';
import { getLocationPermissionHelpMessageForBrowser } from './browserHelper';

export interface LocationCoords {
  latitude: number;
  longitude: number;
  altitude?: number | null;
  accuracy?: number | null;
  altitudeAccuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
}

export interface LocationObject {
  coords: LocationCoords;
  timestamp: number;
}

export interface LocationPermissionStatus {
  status: 'granted' | 'denied' | 'undetermined';
  canAskAgain?: boolean;
}

const DEFAULT_POSITION_TIMEOUT_MS = 12_000;

let cachedLocationModule: any = null;
let isLocationAvailable = false;

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

/**
 * Importa o módulo expo-location de forma robusta
 */
async function importLocationModule(): Promise<any> {
  if (cachedLocationModule && isLocationAvailable) {
    return cachedLocationModule;
  }

  try {
    const locationModule: any = require('expo-location');

    if (!locationModule) {
      throw new Error('Módulo expo-location retornou undefined');
    }

    let Location: any = null;

    if (typeof locationModule === 'object') {
      if (typeof locationModule.requestForegroundPermissionsAsync === 'function') {
        Location = locationModule;
      } else if (
        locationModule.default &&
        typeof locationModule.default.requestForegroundPermissionsAsync === 'function'
      ) {
        Location = locationModule.default;
      } else if (
        locationModule.Location &&
        typeof locationModule.Location.requestForegroundPermissionsAsync === 'function'
      ) {
        Location = locationModule.Location;
      } else {
        Location = locationModule;
      }
    } else {
      Location = locationModule;
    }

    if (!Location || typeof Location.requestForegroundPermissionsAsync !== 'function') {
      throw new Error(
        'Módulo de localização não está disponível. É necessário um development build para usar expo-location.'
      );
    }

    cachedLocationModule = Location;
    isLocationAvailable = true;
    return Location;
  } catch (importError: any) {
    cachedLocationModule = null;
    isLocationAvailable = false;
    throw importError;
  }
}

export async function isLocationModuleAvailable(): Promise<boolean> {
  try {
    await importLocationModule();
    return true;
  } catch {
    return false;
  }
}

export async function requestForegroundPermissions(): Promise<LocationPermissionStatus> {
  try {
    // Web: se o Chrome já bloqueou o site, requestAsync não reabre o prompt.
    if (Platform.OS === 'web') {
      const webState = await queryWebGeolocationState();
      if (webState === 'denied') {
        return { status: 'denied', canAskAgain: false };
      }
    }

    const Location = await importLocationModule();
    const result = await withTimeout(
      Location.requestForegroundPermissionsAsync(),
      15_000,
      'Tempo esgotado ao solicitar permissão de localização. Tente novamente.'
    );
    return {
      status: result.status,
      canAskAgain: result.canAskAgain,
    };
  } catch (error: any) {
    console.error('❌ [locationHelper] Erro ao solicitar permissão:', error);

    // Fallback web: tenta o prompt nativo do navegador (às vezes o expo-location falha no PWA).
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.geolocation) {
      try {
        await withTimeout(
          new Promise<void>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
              () => resolve(),
              (err) => reject(err),
              { enableHighAccuracy: false, timeout: 12_000, maximumAge: 60_000 }
            );
          }),
          13_000,
          'Tempo esgotado ao solicitar permissão de localização.'
        );
        return { status: 'granted', canAskAgain: true };
      } catch (geoErr: any) {
        const code = geoErr?.code;
        // 1 = PERMISSION_DENIED
        if (code === 1) {
          return { status: 'denied', canAskAgain: false };
        }
      }
    }

    throw new Error(
      error?.message ||
        'Não foi possível solicitar permissão de localização. Verifique se o módulo está disponível.'
    );
  }
}

/**
 * Obtém a localização atual com timeout (padrão 12s).
 * No web usa precisão equilibrada para evitar espera longa / uso excessivo de memória do GPS.
 */
export async function getCurrentPosition(options?: {
  accuracy?: number;
  maximumAge?: number;
  timeout?: number;
}): Promise<LocationObject> {
  const timeoutMs = options?.timeout ?? DEFAULT_POSITION_TIMEOUT_MS;
  const maximumAge = options?.maximumAge ?? 60_000;

  try {
    const Location = await importLocationModule();

    // Accuracy: 3 = Balanced (expo-location). Evita High que demora e consome mais no Android.
    const accuracy =
      options?.accuracy ??
      (typeof Location.Accuracy?.Balanced === 'number' ? Location.Accuracy.Balanced : 3);

    const positionPromise = Location.getCurrentPositionAsync({
      accuracy,
      maximumAge,
      mayShowUserSettingsDialog: true,
    });

    const location = await withTimeout(
      positionPromise,
      timeoutMs,
      'Não foi possível obter o GPS a tempo. Verifique se a localização está ligada e tente de novo.'
    );

    return location;
  } catch (error: any) {
    console.error('❌ [locationHelper] Erro ao obter localização:', error);

    // Fallback web: Geolocation API nativa com timeout explícito
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.geolocation) {
      try {
        const loc = await withTimeout(
          new Promise<LocationObject>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                resolve({
                  coords: {
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude,
                    altitude: pos.coords.altitude,
                    accuracy: pos.coords.accuracy,
                    altitudeAccuracy: pos.coords.altitudeAccuracy,
                    heading: pos.coords.heading,
                    speed: pos.coords.speed,
                  },
                  timestamp: pos.timestamp,
                });
              },
              (err) => reject(err),
              { enableHighAccuracy: false, timeout: timeoutMs, maximumAge }
            );
          }),
          timeoutMs + 1000,
          'GPS demorou demais. Ative a localização e tente novamente.'
        );
        return loc;
      } catch (geoErr: any) {
        console.error('❌ [locationHelper] Fallback geolocation falhou:', geoErr);
      }
    }

    throw new Error(
      error?.message ||
        'Não foi possível obter a localização. Verifique se as permissões foram concedidas.'
    );
  }
}

export async function requestPermissionAndGetLocation(options?: {
  accuracy?: number;
  maximumAge?: number;
  timeout?: number;
}): Promise<{ permission: LocationPermissionStatus; location: LocationObject }> {
  const permission = await requestForegroundPermissions();

  if (permission.status !== 'granted') {
    throw new Error('Permissão de localização negada');
  }

  const location = await getCurrentPosition(options);
  return { permission, location };
}

export function getLocationPermissionHelpMessage(): string {
  return getLocationPermissionHelpMessageForBrowser();
}

export function showLocationUnavailableAlert(): void {
  showAlert('Localização indisponível', getLocationPermissionHelpMessage());
}

async function queryWebGeolocationState(): Promise<'granted' | 'denied' | 'prompt' | 'unknown'> {
  if (Platform.OS !== 'web' || typeof navigator === 'undefined') return 'unknown';
  try {
    const perms = (navigator as any).permissions;
    if (perms?.query) {
      const result = await perms.query({ name: 'geolocation' });
      if (result.state === 'granted' || result.state === 'denied' || result.state === 'prompt') {
        return result.state;
      }
    }
  } catch {
    /* Safari antigo etc. */
  }
  return 'unknown';
}

/**
 * Garante permissão de localização.
 * @param options.showAlertWhenDenied — se false, só retorna boolean (sem popup).
 */
export async function ensureLocationPermission(options?: {
  showAlertWhenDenied?: boolean;
}): Promise<boolean> {
  const showWhenDenied = options?.showAlertWhenDenied !== false;

  try {
    const isAvailable = await isLocationModuleAvailable();

    if (!isAvailable) {
      if (showWhenDenied) showLocationUnavailableAlert();
      return false;
    }

    // Na web: se já está "denied", o requestAsync não reabre o prompt do Chrome.
    if (Platform.OS === 'web') {
      const webState = await queryWebGeolocationState();
      if (webState === 'denied') {
        if (showWhenDenied) {
          showAlert('Localização bloqueada neste site', getLocationPermissionHelpMessage());
        }
        return false;
      }
    }

    const permission = await requestForegroundPermissions();

    if (permission.status !== 'granted') {
      if (showWhenDenied) {
        showAlert('Permissão necessária', getLocationPermissionHelpMessage());
      }
      return false;
    }

    return true;
  } catch (error: any) {
    console.error('[locationHelper] Erro ao garantir permissão:', error);
    if (showWhenDenied) {
      showAlert(
        'Erro de localização',
        `${error.message || 'Não foi possível solicitar permissão.'}\n\n${getLocationPermissionHelpMessage()}`
      );
    }
    return false;
  }
}
