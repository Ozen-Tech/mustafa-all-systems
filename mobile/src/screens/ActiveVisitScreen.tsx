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
import { colors, theme } from '../styles/theme';
import { requestForegroundPermissions, getCurrentPosition } from '../utils/locationHelper';

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
};

type ActiveVisitNavigation = NavigationProp<Record<string, object | undefined>>;

export default function ActiveVisitScreen({ route }: any) {
  const navigation = useNavigation<ActiveVisitNavigation>();
  const { visit: initialVisit } = route.params || {};
  const [visit, setVisit] = useState<Visit | null>(initialVisit);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photos, setPhotos] = useState<VisitPhoto[]>([]);

  useEffect(() => {
    loadCurrentVisit();
  }, []);

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
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets) {
        const newPhotos = result.assets.map<VisitPhoto>((asset) => ({
          uri: asset.uri,
          type: 'OTHER',
        }));
        setPhotos((prev) => [...prev, ...newPhotos]);
      }
    } catch (error) {
      console.error('Erro ao selecionar imagem:', error);
      Alert.alert('Erro', 'Não foi possível selecionar a imagem');
    }
  }

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
        const newPhoto: VisitPhoto = {
          uri: result.assets[0].uri,
          type: 'OTHER',
        };
        setPhotos((prev) => [...prev, newPhoto]);
      }
    } catch (error) {
      console.error('Erro ao capturar foto:', error);
      Alert.alert('Erro', 'Não foi possível capturar a foto');
    }
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

      // Upload de cada foto
      const uploadPromises = photos
        .filter((photo) => photo.uri?.startsWith('file://'))
        .map(async (photo) => {
          try {
            console.log('📸 [ActiveVisit] Iniciando upload de foto adicional...');
            
            // Obter presigned URL
            const { presignedUrl, url } = await photoService.getPresignedUrl({
              visitId: visit.id,
              type: photo.type || 'OTHER',
              contentType: 'image/jpeg',
              extension: 'jpg',
            });

            console.log('📸 [ActiveVisit] Presigned URL obtida:', presignedUrl ? 'Sim' : 'Não');
            console.log('📸 [ActiveVisit] URL final:', url);

            // Fazer upload para Firebase Storage
            if (presignedUrl && photo.uri) {
              console.log('📸 [ActiveVisit] Fazendo upload da foto...');
              const uploadSuccess = await photoService.uploadToS3(presignedUrl, photo.uri, 'image/jpeg');
              
              if (!uploadSuccess) {
                console.error('❌ [ActiveVisit] Upload da foto falhou');
                throw new Error('Falha no upload da foto');
              }
              
              console.log('✅ [ActiveVisit] Upload da foto concluído com sucesso');
            } else {
              console.warn('⚠️ [ActiveVisit] Presigned URL ou photoUri não disponível');
            }

            return {
              url,
              type: photo.type || 'OTHER',
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            };
          } catch (error: any) {
            console.error('❌ [ActiveVisit] Erro no upload da foto:', error);
            throw error;
          }
        });

      const uploadedPhotos = await Promise.all(uploadPromises);

      // Registrar fotos no backend
      await visitService.uploadPhotos({
        visitId: visit.id,
        photos: uploadedPhotos,
      });

      Alert.alert('Sucesso', 'Fotos enviadas com sucesso!');
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
        <Text style={styles.sectionTitle}>Fotos ({photos.length})</Text>
        <View style={styles.photoGrid}>
          {photos.map((photo, index) => {
            const sourceUri = photo.uri || photo.url;
            if (!sourceUri) {
              return null;
            }
            return (
              <Image
                key={photo.id ?? sourceUri ?? index}
                source={{ uri: sourceUri }}
                style={styles.photoThumbnail}
              />
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
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  photoThumbnail: {
    width: 100,
    height: 100,
    marginRight: 10,
    marginBottom: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.dark.border,
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
});

