import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { visitService } from '../services/visitService';
import { photoService } from '../services/photoService';
import { industryService } from '../services/industryService';
import { colors, theme } from '../styles/theme';
import { requestForegroundPermissions, getCurrentPosition } from '../utils/locationHelper';
import { savePendingPhotos, getPendingPhotos, clearPendingPhotos, PendingPhoto } from '../utils/sessionStorage';

interface Visit {
  id: string;
  store?: {
    id: string;
    name: string;
    address: string;
  };
  checkInAt: string;
  photos: Array<{
    id: string;
    url: string;
    type: 'FACADE_CHECKIN' | 'FACADE_CHECKOUT' | 'OTHER';
  }>;
}

type VisitPhoto = {
  id?: string;
  uri?: string;
  url?: string;
  type: 'FACADE_CHECKIN' | 'FACADE_CHECKOUT' | 'OTHER';
  industryId?: string; // Indústria selecionada para fotos OTHER
};

type ActiveVisitNavigation = NavigationProp<Record<string, object | undefined>>;

export default function ActiveVisitScreen({ route }: any) {
  const navigation = useNavigation<ActiveVisitNavigation>();
  const { visit: initialVisit } = route.params || {};
  const [visit, setVisit] = useState<Visit | null>(initialVisit);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photos, setPhotos] = useState<VisitPhoto[]>([]);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [industries, setIndustries] = useState<any[]>([]);
  const [showIndustryModal, setShowIndustryModal] = useState(false);
  const [photoForIndustrySelection, setPhotoForIndustrySelection] = useState<number | null>(null);
  const [tempPhoto, setTempPhoto] = useState<string | null>(null); // Foto temporária aguardando seleção de indústria

  useEffect(() => {
    loadCurrentVisit();
    restorePendingPhotos();
  }, []);

  // Carregar indústrias quando a visita estiver disponível
  useEffect(() => {
    if (visit?.store?.id) {
      loadIndustries();
    }
  }, [visit?.store?.id]);

  async function loadIndustries() {
    if (!visit?.store?.id) return;
    
    try {
      // Buscar indústrias obrigatórias da LOJA atual
      const storeIndustries = await industryService.getStoreIndustries(visit.store.id);
      setIndustries(storeIndustries);
      console.log(`📦 [ActiveVisit] Carregadas ${storeIndustries.length} indústrias da loja`);
    } catch (error) {
      console.error('Error loading store industries:', error);
      // Se falhar, tentar buscar indústrias do promotor como fallback
      try {
        const assignments = await industryService.getPromoterIndustries();
        setIndustries(assignments.map(a => a.industry));
      } catch (e) {
        console.error('Error loading fallback industries:', e);
      }
    }
  }

  // Restaurar fotos pendentes ao abrir a tela
  async function restorePendingPhotos() {
    if (!visit?.id) return;
    
    try {
      const pendingPhotos = await getPendingPhotos(visit.id);
      if (pendingPhotos.length > 0) {
        // Converter fotos pendentes para o formato esperado
        const restoredPhotos: VisitPhoto[] = pendingPhotos.map(photo => ({
          uri: photo.uri,
          type: photo.type,
        }));
        setPhotos((prev) => {
          // Evitar duplicatas
          const existingUris = new Set(prev.map(p => p.uri || p.url));
          const newPhotos = restoredPhotos.filter(p => p.uri && !existingUris.has(p.uri));
          return [...prev, ...newPhotos];
        });
        console.log(`[ActiveVisitScreen] Restauradas ${restoredPhotos.length} fotos pendentes`);
      }
    } catch (error) {
      console.error('[ActiveVisitScreen] Erro ao restaurar fotos pendentes:', error);
    }
  }

  async function loadCurrentVisit() {
    try {
      const response = await visitService.getCurrentVisit();
      if (response.visit) {
        setVisit(response.visit);
        setPhotos(
          (response.visit.photos || []).map((photo: Visit['photos'][number]) => ({
            id: photo.id,
            url: photo.url,
            type: photo.type ?? 'OTHER',
          }))
        );
      }
    } catch (error) {
      console.error('Error loading visit:', error);
    }
  }

  async function pickImage() {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão necessária', 'É necessário permitir o acesso à galeria');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: false, // Apenas uma foto por vez para garantir seleção de indústria
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        // Se houver indústrias configuradas, exigir seleção
        if (industries.length > 0) {
          // Guardar foto temporariamente e abrir modal
          setTempPhoto(result.assets[0].uri);
          setShowIndustryModal(true);
        } else {
          // Sem indústrias configuradas, adicionar direto
          const newPhoto: VisitPhoto = {
            uri: result.assets[0].uri,
            type: 'OTHER',
          };
          setPhotos((prev) => {
            const updated = [...prev, newPhoto];
            if (visit?.id) {
              savePendingPhotosToStorage(visit.id, updated);
            }
            return updated;
          });
        }
      }
    } catch (error) {
      console.error('Erro ao selecionar imagem:', error);
      Alert.alert('Erro', 'Não foi possível selecionar a imagem');
    }
  }

  // Função auxiliar para salvar fotos pendentes
  const savePendingPhotosToStorage = async (visitId: string, photosToSave: VisitPhoto[]) => {
    try {
      const pendingPhotos: PendingPhoto[] = photosToSave
        .filter(p => p.uri && !p.url) // Apenas fotos não enviadas (sem URL)
        .map(p => ({
          uri: p.uri!,
          type: p.type,
          visitId,
          timestamp: Date.now(),
        }));
      
      if (pendingPhotos.length > 0) {
        await savePendingPhotos(visitId, pendingPhotos);
      }
    } catch (error) {
      console.error('[ActiveVisitScreen] Erro ao salvar fotos pendentes:', error);
    }
  };

  async function takePhoto() {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão necessária', 'É necessário permitir o acesso à câmera');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        // Se houver indústrias configuradas, exigir seleção
        if (industries.length > 0) {
          // Guardar foto temporariamente e abrir modal
          setTempPhoto(result.assets[0].uri);
          setShowIndustryModal(true);
        } else {
          // Sem indústrias configuradas, adicionar direto
          const newPhoto: VisitPhoto = {
            uri: result.assets[0].uri,
            type: 'OTHER',
          };
          setPhotos((prev) => {
            const updated = [...prev, newPhoto];
            if (visit?.id) {
              savePendingPhotosToStorage(visit.id, updated);
            }
            return updated;
          });
        }
      }
    } catch (error) {
      console.error('Erro ao capturar foto:', error);
      Alert.alert('Erro', 'Não foi possível capturar a foto');
    }
  }

  // Função para selecionar indústria para a foto temporária
  function handleIndustrySelect(industryId: string) {
    if (tempPhoto) {
      const newPhoto: VisitPhoto = {
        uri: tempPhoto,
        type: 'OTHER',
        industryId: industryId,
      };
      setPhotos((prev) => {
        const updated = [...prev, newPhoto];
        if (visit?.id) {
          savePendingPhotosToStorage(visit.id, updated);
        }
        return updated;
      });
      setTempPhoto(null);
    }
    setShowIndustryModal(false);
    setPhotoForIndustrySelection(null);
  }

  // Função para cancelar seleção de indústria (descarta a foto)
  function handleCancelIndustrySelection() {
    setTempPhoto(null);
    setShowIndustryModal(false);
    setPhotoForIndustrySelection(null);
  }

  // Função para obter o código da indústria pelo ID
  function getIndustryById(industryId: string) {
    return industries.find(i => i.id === industryId);
  }

  // Cores para badges de indústria (baseado no código)
  function getIndustryColor(code: string): string {
    const colors: Record<string, string> = {
      'A': '#FF6B6B', 'B': '#4ECDC4', 'C': '#45B7D1', 'D': '#96CEB4',
      'E': '#FFEAA7', 'F': '#DDA0DD', 'G': '#98D8C8', 'H': '#F7DC6F',
      'I': '#BB8FCE', 'J': '#85C1E9', 'K': '#F8B500', 'L': '#00CED1',
      'M': '#FF69B4', 'N': '#32CD32', 'O': '#FFD700', 'P': '#FF4500',
    };
    const firstChar = (code || 'A').charAt(0).toUpperCase();
    return colors[firstChar] || '#6C63FF';
  }

  async function uploadPhotos() {
    if (!visit || photos.length === 0) {
      Alert.alert('Erro', 'Não há fotos para enviar');
      return;
    }

    setUploading(true);
    try {
      // Solicitar permissão de localização
      const permission = await requestForegroundPermissions();
      
      if (permission.status !== 'granted') {
        Alert.alert(
          'Permissão necessária',
          'É necessário permitir o acesso à localização para enviar fotos.',
          [
            { text: 'Cancelar', style: 'cancel', onPress: () => setUploading(false) },
            { text: 'Tentar novamente', onPress: uploadPhotos },
          ]
        );
        return;
      }
      
      // Obter localização atual
      const location = await getCurrentPosition();

      // Filtrar apenas fotos novas (que têm uri e ainda não foram enviadas)
      const photosToUpload = photos.filter((photo) => {
        const hasUri = photo.uri && photo.uri.startsWith('file://');
        const alreadyUploaded = photo.url && !photo.uri; // Já tem URL mas não tem URI = já foi enviada
        return hasUri && !alreadyUploaded;
      });

      console.log('📸 [ActiveVisit] Total de fotos:', photos.length);
      console.log('📸 [ActiveVisit] Fotos para upload:', photosToUpload.length);
      photosToUpload.forEach((photo, index) => {
        console.log(`📸 [ActiveVisit] Foto ${index + 1}:`, {
          hasUri: !!photo.uri,
          uri: photo.uri?.substring(0, 50),
          type: photo.type,
          hasUrl: !!photo.url,
        });
      });

      if (photosToUpload.length === 0) {
        Alert.alert('Aviso', 'Não há fotos novas para enviar');
        setUploading(false);
        return;
      }

      // Upload de cada foto
      const uploadPromises = photosToUpload.map(async (photo) => {
        try {
          console.log('📸 [ActiveVisit] Iniciando upload de foto adicional...');
          console.log('📸 [ActiveVisit] Tipo:', photo.type || 'OTHER');
          console.log('📸 [ActiveVisit] URI:', photo.uri?.substring(0, 50));
          
          // Obter presigned URL
          const { presignedUrl, url } = await photoService.getPresignedUrl({
            visitId: visit.id,
            type: (photo.type || 'OTHER') as 'FACADE_CHECKIN' | 'FACADE_CHECKOUT' | 'OTHER',
            contentType: 'image/jpeg',
            extension: 'jpg',
          });

          console.log('📸 [ActiveVisit] Presigned URL obtida:', presignedUrl ? 'Sim' : 'Não');
          console.log('📸 [ActiveVisit] URL final:', url);

          // Fazer upload para Firebase Storage
          if (presignedUrl && photo.uri) {
            console.log('📸 [ActiveVisit] Fazendo upload da foto para Firebase...');
            console.log('📸 [ActiveVisit] Presigned URL (primeiros 150 chars):', presignedUrl.substring(0, 150));
            console.log('📸 [ActiveVisit] Photo URI:', photo.uri);
            
            const uploadSuccess = await photoService.uploadToFirebase(presignedUrl, photo.uri, 'image/jpeg');
            
            if (!uploadSuccess) {
              console.error('❌ [ActiveVisit] Upload da foto falhou - uploadSuccess retornou false');
              console.error('❌ [ActiveVisit] NÃO será salvo no banco de dados');
              throw new Error('Falha no upload da foto - upload retornou false');
            }
            
            console.log('✅ [ActiveVisit] Upload da foto concluído com sucesso');
            console.log('✅ [ActiveVisit] URL da foto que será salva:', url);
            
            // Verificar se a URL está correta antes de retornar
            if (!url || url.includes('placeholder.com') || url.includes('mock-storage.local')) {
              console.error('❌ [ActiveVisit] URL inválida gerada:', url);
              throw new Error('URL inválida gerada pelo backend');
            }
          } else {
            console.warn('⚠️ [ActiveVisit] Presigned URL ou photoUri não disponível');
            console.warn('⚠️ [ActiveVisit] presignedUrl:', !!presignedUrl, 'photo.uri:', !!photo.uri);
            throw new Error('Presigned URL ou photoUri não disponível');
          }

          const photoData = {
            url,
            type: (photo.type || 'OTHER') as 'FACADE_CHECKIN' | 'FACADE_CHECKOUT' | 'OTHER',
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          };

          // Se for foto OTHER e tiver indústria selecionada, associar após upload
          if (photo.type === 'OTHER' && photo.industryId && visit.id) {
            try {
              // Aguardar um pouco para garantir que a foto foi salva no banco
              setTimeout(async () => {
                try {
                  // Buscar a foto recém-criada pelo URL
                  const visitData = await visitService.getCurrentVisit();
                  const uploadedPhoto = visitData.visit.photos.find((p: any) => p.url === url);
                  
                  if (uploadedPhoto && photo.industryId) {
                    await industryService.associatePhotoToIndustry({
                      photoId: uploadedPhoto.id,
                      industryId: photo.industryId,
                      visitId: visit.id,
                    });
                    console.log('✅ [ActiveVisit] Foto associada à indústria:', photo.industryId);
                  }
                } catch (error) {
                  console.error('❌ [ActiveVisit] Erro ao associar foto à indústria:', error);
                }
              }, 2000);
            } catch (error) {
              console.error('❌ [ActiveVisit] Erro ao agendar associação de indústria:', error);
            }
          }

          return photoData;
        } catch (error: any) {
          console.error('❌ [ActiveVisit] Erro no upload da foto:', error);
          console.error('❌ [ActiveVisit] Mensagem:', error?.message);
          console.error('❌ [ActiveVisit] Stack:', error?.stack);
          throw error;
        }
      });

      // Executar uploads (permitir que alguns falhem sem parar todos)
      const uploadResults = await Promise.allSettled(uploadPromises);
      
      const uploadedPhotos = uploadResults
        .filter((result) => result.status === 'fulfilled')
        .map((result) => (result as PromiseFulfilledResult<any>).value);
      
      const failedUploads = uploadResults.filter((result) => result.status === 'rejected');
      
      if (failedUploads.length > 0) {
        console.error('❌ [ActiveVisit] ===== FOTOS QUE FALHARAM NO UPLOAD =====');
        console.error('❌ [ActiveVisit] Total de falhas:', failedUploads.length);
        failedUploads.forEach((result, index) => {
          const reason = (result as PromiseRejectedResult).reason;
          console.error(`❌ [ActiveVisit] Foto ${index + 1} falhou:`, {
            message: reason?.message || String(reason),
            error: reason,
          });
        });
        console.error('❌ [ActiveVisit] ===========================================');
      }

      if (uploadedPhotos.length === 0) {
        Alert.alert('Erro', 'Nenhuma foto foi enviada com sucesso');
        setUploading(false);
        return;
      }

      console.log('✅ [ActiveVisit] Fotos enviadas com sucesso:', uploadedPhotos.length);

      // Registrar fotos no backend
      try {
        await visitService.uploadPhotos({
          visitId: visit.id,
          photos: uploadedPhotos,
        });
        console.log('✅ [ActiveVisit] Fotos registradas no backend');
        
        // Limpar fotos pendentes após upload bem-sucedido
        await clearPendingPhotos(visit.id);
        
        // Atualizar estado das fotos (remover URIs e manter apenas URLs)
        setPhotos((prev) => {
          return prev.map((photo) => {
            // Se a foto foi enviada, remover URI e manter URL
            const uploadedPhoto = uploadedPhotos.find(
              (up) => up.url && prev.find((p) => p.uri === photo.uri)
            );
            if (uploadedPhoto) {
              return {
                ...photo,
                url: uploadedPhoto.url,
                uri: undefined, // Remover URI após upload
              };
            }
            return photo;
          });
        });
      } catch (error: any) {
        console.error('❌ [ActiveVisit] Erro ao registrar fotos no backend:', error);
        Alert.alert('Aviso', `${uploadedPhotos.length} foto(s) foram enviadas, mas houve erro ao registrar no sistema`);
        setUploading(false);
        return;
      }

      if (failedUploads.length > 0) {
        Alert.alert(
          'Sucesso parcial',
          `${uploadedPhotos.length} foto(s) enviadas com sucesso. ${failedUploads.length} foto(s) falharam.`
        );
      } else {
        Alert.alert('Sucesso', `${uploadedPhotos.length} foto(s) enviadas com sucesso!`);
      }
      
      await loadCurrentVisit();
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.message || 'Erro ao enviar fotos');
    } finally {
      setUploading(false);
    }
  }

  function navigateToPriceResearch() {
    navigation.navigate('PriceResearch', { visit });
  }

  function navigateToCheckout() {
    navigation.navigate('Checkout', { visit });
  }

  if (!visit) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Nenhuma visita em andamento</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Visita em Andamento</Text>
        <Text style={styles.storeName}>{visit.store?.name ?? 'Loja'}</Text>
        <Text style={styles.address}>{visit.store?.address ?? 'Endereço não disponível'}</Text>
        <Text style={styles.time}>
          Check-in: {new Date(visit.checkInAt).toLocaleTimeString()}
        </Text>
      </View>

      <View style={styles.section}>
        <View style={styles.photoHeader}>
          <Text style={styles.sectionTitle}>Fotos do Trabalho</Text>
          <View style={styles.photoCounter}>
            <Text style={styles.photoCounterText}>
              {photos.filter(p => p.uri && !p.url).length} pendentes / {photos.length} total
            </Text>
          </View>
        </View>
        <View style={styles.photoGrid}>
          {photos.map((photo, index) => {
            const sourceUri = photo.uri || photo.url;
            if (!sourceUri) {
              return null;
            }
            const isPending = !!photo.uri && !photo.url;
            const industry = photo.industryId ? getIndustryById(photo.industryId) : null;
            return (
              <TouchableOpacity
                key={photo.id ?? sourceUri ?? index}
                style={styles.photoThumbnailContainer}
                onPress={() => setSelectedPhotoIndex(index)}
                activeOpacity={0.8}
              >
                <Image
                  source={{ uri: sourceUri }}
                  style={styles.photoThumbnail as any}
                />
                {/* Badge da indústria */}
                {industry && (
                  <View style={[styles.industryBadgeSmall, { backgroundColor: getIndustryColor(industry.code) }]}>
                    <Text style={styles.industryBadgeSmallText}>{industry.code}</Text>
                  </View>
                )}
                {isPending && (
                  <View style={styles.pendingBadge}>
                    <Text style={styles.pendingBadgeText}>Pendente</Text>
                  </View>
                )}
                {!isPending && (
                  <View style={styles.uploadedBadge}>
                    <Text style={styles.uploadedBadgeText}>✓</Text>
                  </View>
                )}
                {isPending && (
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      Alert.alert(
                        'Remover foto',
                        'Deseja remover esta foto?',
                        [
                          { text: 'Cancelar', style: 'cancel' },
                          {
                            text: 'Remover',
                            style: 'destructive',
                            onPress: () => {
                              setPhotos((prev) => prev.filter((_, i) => i !== index));
                              if (visit?.id) {
                                const updated = photos.filter((_, i) => i !== index);
                                savePendingPhotosToStorage(visit.id, updated);
                              }
                            },
                          },
                        ]
                      );
                    }}
                  >
                    <Text style={styles.deleteButtonText}>×</Text>
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={styles.buttonRow}>
          <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={pickImage}>
            <Text style={styles.buttonText}>Galeria</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={takePhoto}>
            <Text style={styles.buttonText}>Câmera</Text>
          </TouchableOpacity>
        </View>
        {photos.length > 0 && (
          <TouchableOpacity
            style={[styles.button, styles.uploadButton]}
            onPress={uploadPhotos}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Enviar Fotos</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={navigateToPriceResearch}>
          <Text style={styles.buttonText}>Pesquisa de Preços</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={[styles.button, styles.checkoutButton]} onPress={navigateToCheckout}>
          <Text style={styles.buttonText}>Fazer Checkout</Text>
        </TouchableOpacity>
      </View>

      {/* Modal de Preview Fullscreen */}
      {selectedPhotoIndex !== null && photos[selectedPhotoIndex] && (
        <View style={styles.fullscreenModal}>
          <TouchableOpacity
            style={styles.fullscreenBackdrop}
            activeOpacity={1}
            onPress={() => setSelectedPhotoIndex(null)}
          >
            <View style={styles.fullscreenContent}>
              <TouchableOpacity
                style={styles.fullscreenClose}
                onPress={() => setSelectedPhotoIndex(null)}
              >
                <Text style={styles.fullscreenCloseText}>✕</Text>
              </TouchableOpacity>
              <Image
                source={{ uri: photos[selectedPhotoIndex].uri || photos[selectedPhotoIndex].url }}
                style={styles.fullscreenImage as any}
                resizeMode="contain"
              />
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Modal de Seleção de Indústria com Preview */}
      {showIndustryModal && tempPhoto && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Selecione a Indústria</Text>
            
            {/* Preview da foto */}
            <View style={styles.photoPreviewContainer}>
              <Image source={{ uri: tempPhoto }} style={styles.photoPreview as any} />
            </View>
            
            <Text style={styles.modalSubtitle}>
              Para qual indústria é esta foto?
            </Text>
            
            <ScrollView style={styles.industriesList}>
              {industries.map((industry) => (
                <TouchableOpacity
                  key={industry.id}
                  style={styles.industryOption}
                  onPress={() => handleIndustrySelect(industry.id)}
                >
                  <View style={[styles.industryBadge, { backgroundColor: getIndustryColor(industry.code) }]}>
                    <Text style={styles.industryBadgeText}>{industry.code}</Text>
                  </View>
                  <View style={styles.industryTextContainer}>
                    <Text style={styles.industryOptionText}>{industry.name}</Text>
                    {industry.description && (
                      <Text style={styles.industryDescription}>{industry.description}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={handleCancelIndustrySelection}
            >
              <Text style={styles.modalCancelText}>Cancelar (descartar foto)</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.background,
  },
  header: {
    backgroundColor: colors.dark.card,
    padding: 20,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark.border,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: colors.text.primary,
  },
  storeName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 5,
    color: colors.text.primary,
  },
  address: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 10,
  },
  time: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
  section: {
    backgroundColor: colors.dark.card,
    padding: 20,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.dark.border,
    borderRadius: theme.borderRadius.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    color: colors.text.primary,
  },
  photoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  photoCounter: {
    backgroundColor: colors.dark.cardElevated,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  photoCounterText: {
    fontSize: theme.typography.fontSize.sm,
    color: colors.text.secondary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
    gap: 8,
  },
  photoThumbnailContainer: {
    width: '31%',
    aspectRatio: 1,
    position: 'relative',
    marginBottom: 8,
  },
  photoThumbnail: {
    width: '100%',
    height: '100%',
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: colors.dark.border,
    backgroundColor: colors.dark.cardElevated,
  },
  pendingBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: colors.warning + 'CC',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  pendingBadgeText: {
    fontSize: 10,
    color: colors.text.primary,
    fontWeight: theme.typography.fontWeight.bold,
  },
  uploadedBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: colors.success + 'CC',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadedBadgeText: {
    fontSize: 12,
    color: colors.text.primary,
    fontWeight: theme.typography.fontWeight.bold,
  },
  deleteButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: colors.error + 'CC',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 18,
    color: colors.text.primary,
    fontWeight: theme.typography.fontWeight.bold,
    lineHeight: 18,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  button: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: colors.primary[600],
  },
  secondaryButton: {
    backgroundColor: colors.success,
  },
  uploadButton: {
    backgroundColor: colors.accent[500],
  },
  checkoutButton: {
    backgroundColor: colors.error,
  },
  buttonText: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  text: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 50,
    color: colors.text.secondary,
  },
  fullscreenModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  fullscreenBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  fullscreenClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1001,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenCloseText: {
    color: colors.text.primary,
    fontSize: 24,
    fontWeight: 'bold',
  },
  fullscreenImage: {
    width: '100%',
    height: '100%',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: colors.dark.card,
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 16,
  },
  industriesList: {
    maxHeight: 300,
    marginBottom: 16,
  },
  industryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.dark.background,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  industryOptionSelected: {
    borderColor: colors.primary[600],
    backgroundColor: colors.primary[600] + '20',
  },
  industryOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  industryOptionCode: {
    fontSize: 12,
    color: colors.text.secondary,
    fontFamily: 'monospace',
  },
  modalCancelButton: {
    padding: 12,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: colors.error + '30',
    borderWidth: 1,
    borderColor: colors.error,
  },
  modalCancelText: {
    fontSize: 16,
    color: colors.error,
    fontWeight: '600',
  },
  // Estilos para preview da foto no modal
  photoPreviewContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  photoPreview: {
    width: 150,
    height: 150,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.dark.border,
  },
  // Estilos para badges de indústria
  industryBadge: {
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  industryBadgeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  industryTextContainer: {
    flex: 1,
  },
  industryDescription: {
    fontSize: 12,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  industryBadgeSmall: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    minWidth: 28,
    alignItems: 'center',
  },
  industryBadgeSmallText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});

