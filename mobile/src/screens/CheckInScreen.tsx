import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Image,
  Platform,
  AppState,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { visitService } from '../services/visitService';
import { photoService } from '../services/photoService';
import { pickSinglePhoto } from '../utils/imagePickerHelper';
import { preparePhotoForWebUpload } from '../utils/photoUri';
import {
  saveCheckInDraft,
  loadCheckInDraft,
  clearCheckInDraft,
} from '../utils/checkInDraftStorage';
import {
  detectWebBrowser,
  isRecommendedBrowser,
  openAppInChrome,
} from '../utils/browserHelper';
import { useVisitFlow } from '../features/visits';
import { useAuth } from '../context/AuthContext';
import { colors, theme } from '../styles/theme';
import { flexScroll } from '../styles/webLayout';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import {
  requestForegroundPermissions,
  getCurrentPosition,
  LocationObject,
  getLocationPermissionHelpMessage,
} from '../utils/locationHelper';
import { showAlert } from '../utils/alertHelper';

interface Store {
  id: string;
  name: string;
  address: string;
}

type RootStackParamList = {
  ActiveVisit: { visit: any };
};

export default function CheckInScreen({ route }: any) {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { store, location: initialLocation } = route.params || {};
  const { user } = useAuth();
  const { startVisit, setCheckedIn, clearVisit } = useVisitFlow();
  const [locationPermission, setLocationPermission] = useState<boolean>(false);
  const [location, setLocation] = useState<LocationObject | null>(() => {
    if (
      initialLocation &&
      typeof initialLocation.latitude === 'number' &&
      typeof initialLocation.longitude === 'number'
    ) {
      return {
        coords: {
          latitude: initialLocation.latitude,
          longitude: initialLocation.longitude,
        },
        timestamp: Date.now(),
      };
    }
    return null;
  });
  const [loading, setLoading] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [locating, setLocating] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(null);
  const draftRestored = useRef(false);

  const refreshLocation = useCallback(async (options?: { silent?: boolean }) => {
    setLocating(true);
    try {
      const permission = await requestForegroundPermissions();
      setLocationPermission(permission.status === 'granted');

      if (permission.status !== 'granted') {
        if (!options?.silent) {
          showAlert('Permissão necessária', getLocationPermissionHelpMessage(), [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Tentar novamente', onPress: () => void refreshLocation() },
          ]);
        }
        return;
      }

      const loc = await getCurrentPosition({ timeout: 15_000, maximumAge: 30_000 });
      setLocation(loc);
    } catch (gpsError: any) {
      console.warn('[CheckIn] GPS falhou:', gpsError);
      if (!options?.silent) {
        showAlert(
          'GPS indisponível',
          `${gpsError?.message || 'Não foi possível obter a localização.'}\n\n${getLocationPermissionHelpMessage()}`
        );
      }
    } finally {
      setLocating(false);
    }
  }, []);

  useEffect(() => {
    void refreshLocation({ silent: true });
    void requestCameraPermission();
  }, [refreshLocation]);

  // Restaura foto se o PWA recarregou após tirar foto (OOM / memória).
  useEffect(() => {
    if (!store?.id || !user?.id || draftRestored.current) return;
    draftRestored.current = true;

    void (async () => {
      const draft = await loadCheckInDraft(user.id, store.id);
      if (draft?.photoUri) {
        setPhotoUri(draft.photoUri);
        setShowPreview(true);
      }
    })();
  }, [store?.id, user?.id]);

  // Ao voltar da câmera ou reabrir a aba, o GPS costuma precisar de nova leitura.
  useEffect(() => {
    const onAppActive = (state: string) => {
      if (state === 'active') {
        void refreshLocation({ silent: true });
      }
    };

    const sub = AppState.addEventListener('change', onAppActive);

    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const onVisibility = () => {
        if (document.visibilityState === 'visible') {
          void refreshLocation({ silent: true });
        }
      };
      document.addEventListener('visibilitychange', onVisibility);
      return () => {
        sub.remove();
        document.removeEventListener('visibilitychange', onVisibility);
      };
    }

    return () => sub.remove();
  }, [refreshLocation]);

  async function requestCameraPermission() {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      setCameraPermission(status === 'granted');
    } catch (error) {
      console.error('Erro ao solicitar permissão de câmera:', error);
      setCameraPermission(false);
    }
  }

  async function resolveLocationForCheckIn(): Promise<LocationObject | null> {
    if (location) return location;

    try {
      setLocating(true);
      const permission = await requestForegroundPermissions();
      if (permission.status !== 'granted') {
        showAlert('Permissão necessária', getLocationPermissionHelpMessage());
        return null;
      }
      const loc = await getCurrentPosition({ timeout: 18_000, maximumAge: 0 });
      setLocation(loc);
      return loc;
    } catch (gpsError: any) {
      showAlert(
        'GPS indisponível',
        `${gpsError?.message || 'Não foi possível obter a localização.'}\n\nAtive o GPS do celular e toque em "Atualizar GPS" antes de enviar.`
      );
      return null;
    } finally {
      setLocating(false);
    }
  }

  function clearSelectedPhoto() {
    setPhotoUri(null);
    setShowPreview(false);
    if (user?.id) void clearCheckInDraft(user.id);
  }

  async function takePhoto() {
    if (capturing || loading) return;
    setCapturing(true);
    try {
      // Perfil checkin: compressão máxima (Galaxy A16 / low RAM).
      const uri = await pickSinglePhoto({
        quality: Platform.OS === 'web' ? 0.28 : 0.55,
        profile: 'checkin',
      });
      if (uri) {
        setPhotoUri(uri);
        setShowPreview(true);
        if (user?.id && store?.id) {
          void saveCheckInDraft(user.id, store.id, uri);
        }
        void refreshLocation({ silent: true });
      }
    } catch (error: any) {
      console.error('Erro ao capturar foto:', error);
      showAlert(
        'Memória do celular',
        error?.message ||
          'O celular ficou sem memória ao processar a foto. Feche o Chrome por completo, abra de novo, ou escolha uma foto leve da galeria.'
      );
    } finally {
      setCapturing(false);
    }
  }

  async function handleCheckIn() {
    if (!store) {
      showAlert('Erro', 'Selecione uma loja primeiro');
      return;
    }

    if (!photoUri) {
      showAlert('Erro', 'Tire uma foto da fachada primeiro');
      return;
    }

    const activeLocation = await resolveLocationForCheckIn();
    if (!activeLocation) {
      return;
    }

    setLoading(true);
    let visitStartedLocally = false;

    try {
      await startVisit({
        storeId: store.id,
        storeName: store.name,
        storeAddress: store.address,
        promoterId: user?.id || 'unknown',
      });
      visitStartedLocally = true;

      const tempPhotoUrl = 'https://placeholder.com/checkin.jpg';

      const checkInResult = await visitService.checkIn({
        storeId: store.id,
        latitude: activeLocation.coords.latitude,
        longitude: activeLocation.coords.longitude,
        photoUrl: tempPhotoUrl,
      });

      const visitId = checkInResult.visit?.id;
      if (!visitId) {
        throw new Error('Não foi possível obter o ID da visita');
      }

      await setCheckedIn(
        visitId,
        activeLocation.coords.latitude,
        activeLocation.coords.longitude
      );

      let photoUrl = '';
      let uploadUri = photoUri;

      try {
        if (Platform.OS === 'web') {
          // Já vem comprimida; só reaperta se ainda estiver grande.
          uploadUri = await preparePhotoForWebUpload(photoUri, 'checkin');
          if (uploadUri !== photoUri) {
            setPhotoUri(uploadUri);
          }
        }

        const { url: photoUrlUploaded } = await photoService.uploadPhoto({
          visitId,
          type: 'FACADE_CHECKIN',
          contentType: 'image/jpeg',
          extension: 'jpg',
          fileUri: uploadUri,
        });

        photoUrl = photoUrlUploaded;
      } catch (uploadError: any) {
        console.error('❌ [CheckIn] Erro no upload da foto:', uploadError);
        photoUrl = tempPhotoUrl;
      }

      if (photoUrl && photoUrl !== tempPhotoUrl) {
        try {
          await visitService.uploadPhotos({
            visitId,
            photos: [
              {
                url: photoUrl,
                type: 'FACADE_CHECKIN',
                latitude: activeLocation.coords.latitude,
                longitude: activeLocation.coords.longitude,
              },
            ],
          });
        } catch (updateError: any) {
          console.warn('⚠️ [CheckIn] Erro ao atualizar registro da foto:', updateError);
        }
      }

      if (user?.id) {
        await clearCheckInDraft(user.id);
      }

      const result = checkInResult;
      navigation.navigate('ActiveVisit', { visit: result.visit });
    } catch (error: any) {
      console.error('❌ [CheckIn] Erro no check-in:', error);

      if (visitStartedLocally) {
        try {
          await clearVisit();
        } catch {
          /* ignore */
        }
      }

      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        'Erro ao fazer check-in. Verifique sua conexão e tente novamente.';

      showAlert('Erro', errorMessage);
    } finally {
      setLoading(false);
    }
  }

  if (cameraPermission === null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary[600]} />
      </View>
    );
  }

  if (cameraPermission === false) {
    return (
      <View style={styles.container}>
        <Card style={styles.permissionCard}>
          <Text style={styles.permissionIcon}>📷</Text>
          <Text style={styles.permissionTitle}>Permissão de Câmera Necessária</Text>
          <Text style={styles.permissionText}>
            Precisamos do acesso à câmera para tirar fotos da fachada das lojas.
          </Text>
          <Button
            variant="primary"
            size="lg"
            onPress={requestCameraPermission}
            style={styles.permissionButton}
          >
            Permitir Câmera
          </Button>
        </Card>
      </View>
    );
  }

  const gpsReady = !!location;
  const canSubmitCheckIn = !!photoUri && !loading;

  return (
    <ScrollView style={[styles.container, flexScroll]} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>Check-in</Text>
        <Text style={styles.subtitle}>Tire uma foto da fachada da loja</Text>
      </View>

      {store && (
        <Card style={styles.storeCard} shadow>
          <View style={styles.storeHeader}>
            <View style={styles.storeIcon}>
              <Text style={styles.storeIconText}>🏪</Text>
            </View>
            <View style={styles.storeInfo}>
              <Text style={styles.storeName}>{store.name}</Text>
              <Text style={styles.storeAddress}>{store.address}</Text>
            </View>
          </View>
        </Card>
      )}

      {showPreview && photoUri ? (
        <Card style={styles.previewCard} shadow>
          <View style={styles.previewHeader}>
            <Text style={styles.previewTitle}>Preview da Foto</Text>
            <TouchableOpacity onPress={clearSelectedPhoto} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
          <Image source={{ uri: photoUri }} style={styles.previewImage} />
          <View style={styles.previewActions}>
            <Button
              variant="outline"
              size="md"
              onPress={takePhoto}
              style={styles.previewButton}
            >
              Tirar Outra
            </Button>
            <Button
              variant="outline"
              size="md"
              onPress={clearSelectedPhoto}
              style={styles.previewButton}
            >
              Excluir foto
            </Button>
          </View>
        </Card>
      ) : (
        <Card style={styles.cameraCard} shadow>
          <View style={styles.cameraPlaceholder}>
            <Text style={styles.cameraIcon}>📷</Text>
            <Text style={styles.cameraText}>Pronto para tirar foto</Text>
          </View>
        </Card>
      )}

      <Card style={styles.statusCard} shadow>
        <View style={styles.statusRow}>
          <View style={styles.statusItem}>
            <View
              style={[
                styles.statusIndicator,
                gpsReady ? styles.statusIndicatorActive : undefined,
              ]}
            >
              <Text style={styles.statusIcon}>{gpsReady ? '✓' : locating ? '…' : '○'}</Text>
            </View>
            <View style={styles.statusInfo}>
              <Text style={styles.statusLabel}>Localização</Text>
              <Text style={styles.statusValue}>
                {gpsReady
                  ? `${location!.coords.latitude.toFixed(4)}, ${location!.coords.longitude.toFixed(4)}`
                  : locating
                    ? 'Obtendo GPS...'
                    : locationPermission
                      ? 'Aguardando sinal GPS'
                      : 'Permissão necessária'}
              </Text>
            </View>
          </View>
          <View style={styles.statusItem}>
            <View
              style={[
                styles.statusIndicator,
                photoUri ? styles.statusIndicatorActive : undefined,
              ]}
            >
              <Text style={styles.statusIcon}>{photoUri ? '✓' : '○'}</Text>
            </View>
            <View style={styles.statusInfo}>
              <Text style={styles.statusLabel}>Foto</Text>
              <Text style={styles.statusValue}>{photoUri ? 'Capturada' : 'Pendente'}</Text>
            </View>
          </View>
        </View>
        {!gpsReady && (
          <Button
            variant="outline"
            size="sm"
            onPress={() => void refreshLocation()}
            isLoading={locating}
            disabled={locating || loading}
            style={styles.gpsRetryButton}
          >
            📍 Atualizar GPS
          </Button>
        )}
        {!gpsReady && !locationPermission ? (
          <View style={styles.gpsHelpBox}>
            <Text style={styles.gpsHelpTitle}>Localização bloqueada neste celular</Text>
            <Text style={styles.gpsHelpText}>
              {detectWebBrowser() === 'samsung'
                ? '1. Toque no cadeado/escudo ao lado do endereço\n2. Permissões → Localização → Permitir\n3. Localização do celular ligada\n4. Se falhar: abra no Chrome (ícone colorido)'
                : '1. Toque no cadeado (ou ⓘ) ao lado do endereço do site\n2. Localização → Permitir\n3. Confira se a Localização do celular está ligada\n4. Volte aqui e toque em "Atualizar GPS"'}
            </Text>
            {Platform.OS === 'web' && !isRecommendedBrowser() ? (
              <Button
                variant="primary"
                size="sm"
                onPress={() => void openAppInChrome()}
                style={styles.gpsRetryButton}
              >
                Abrir no Chrome
              </Button>
            ) : null}
          </View>
        ) : null}
      </Card>

      <View style={styles.actions}>
        {!showPreview && (
          <Button
            variant="accent"
            size="lg"
            onPress={takePhoto}
            disabled={loading || capturing}
            isLoading={capturing}
            style={styles.actionButton}
          >
            {capturing ? 'Processando foto...' : '📷 Tirar Foto'}
          </Button>
        )}
        {capturing ? (
          <Text style={styles.gpsHint}>
            Aguarde — em celulares com pouca memória a foto é reduzida antes de aparecer.
          </Text>
        ) : null}
        <Button
          variant="primary"
          size="lg"
          onPress={handleCheckIn}
          isLoading={loading}
          disabled={!canSubmitCheckIn}
          style={styles.actionButton}
        >
          ✅ Fazer Check-in
        </Button>
        {!gpsReady && photoUri ? (
          <Text style={styles.gpsHint}>
            Com a foto pronta, toque em &quot;Atualizar GPS&quot; ou em &quot;Fazer Check-in&quot; — o app
            tentará capturar a localização na hora do envio.
          </Text>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.background,
  },
  contentContainer: {
    padding: theme.spacing.lg,
  },
  header: {
    marginBottom: theme.spacing.xl,
  },
  title: {
    fontSize: theme.typography.fontSize['3xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: theme.typography.fontSize.base,
    color: colors.text.secondary,
  },
  storeCard: {
    marginBottom: theme.spacing.lg,
  },
  storeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  storeIcon: {
    width: 50,
    height: 50,
    borderRadius: theme.borderRadius.full,
    backgroundColor: 'rgba(124, 58, 237, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  storeIconText: {
    fontSize: 24,
  },
  storeInfo: {
    flex: 1,
  },
  storeName: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  storeAddress: {
    fontSize: theme.typography.fontSize.sm,
    color: colors.text.secondary,
  },
  cameraCard: {
    marginBottom: theme.spacing.lg,
    minHeight: 200,
  },
  cameraPlaceholder: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.dark.card,
    borderRadius: theme.borderRadius.lg,
  },
  cameraIcon: {
    fontSize: 48,
    marginBottom: theme.spacing.md,
  },
  cameraText: {
    fontSize: theme.typography.fontSize.base,
    color: colors.text.secondary,
  },
  previewCard: {
    marginBottom: theme.spacing.lg,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  previewTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: colors.text.primary,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.full,
    backgroundColor: colors.dark.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: colors.text.secondary,
  },
  previewImage: {
    width: '100%',
    height: 300,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
  },
  previewActions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  previewButton: {
    flex: 1,
  },
  statusCard: {
    marginBottom: theme.spacing.lg,
  },
  statusRow: {
    gap: theme.spacing.md,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.full,
    backgroundColor: colors.dark.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  statusIndicatorActive: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
  },
  statusIcon: {
    fontSize: 20,
    fontWeight: theme.typography.fontWeight.bold,
  },
  statusInfo: {
    flex: 1,
  },
  statusLabel: {
    fontSize: theme.typography.fontSize.xs,
    color: colors.text.tertiary,
    marginBottom: theme.spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusValue: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: colors.text.primary,
  },
  gpsRetryButton: {
    marginTop: theme.spacing.md,
  },
  gpsHelpBox: {
    marginTop: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
  },
  gpsHelpTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  gpsHelpText: {
    fontSize: theme.typography.fontSize.sm,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  gpsHint: {
    fontSize: theme.typography.fontSize.sm,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  actions: {
    gap: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  actionButton: {
    width: '100%',
  },
  permissionCard: {
    margin: theme.spacing.xl,
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  permissionIcon: {
    fontSize: 64,
    marginBottom: theme.spacing.lg,
  },
  permissionTitle: {
    fontSize: theme.typography.fontSize['2xl'],
    fontWeight: theme.typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: theme.typography.fontSize.base,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
    lineHeight: 22,
  },
  permissionButton: {
    width: '100%',
  },
});
