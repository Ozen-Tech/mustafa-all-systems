import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { colors, theme } from '../styles/theme';
import { flexScroll } from '../styles/webLayout';
import { layout, screenStyles } from '../styles/layout';
import ScreenHeader from '../components/ui/ScreenHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Section from '../components/ui/Section';
import Badge from '../components/ui/Badge';
import { showAlert } from '../utils/alertHelper';
import { ensurePersistablePhotoUri } from '../utils/photoUri';
import {
  DAY_ABSENCE_REASONS,
  DayAbsence,
  DayAbsenceReason,
  dayAbsenceService,
} from '../services/dayAbsenceService';

function todayBRT(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export default function JustifyAbsenceScreen() {
  const navigation = useNavigation();
  const [date, setDate] = useState(todayBRT());
  const [reason, setReason] = useState<DayAbsenceReason>('MEDICAL_CERTIFICATE');
  const [note, setNote] = useState('');
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [contentType, setContentType] = useState<string>('image/jpeg');
  const [existing, setExisting] = useState<DayAbsence | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadToday = useCallback(async () => {
    try {
      setLoading(true);
      const { date: d, absence } = await dayAbsenceService.getToday();
      setDate(d);
      if (absence) {
        setExisting(absence);
        setReason(absence.reason);
        setNote(absence.note || '');
      } else {
        setExisting(null);
      }
    } catch (e: any) {
      console.warn('[JustifyAbsence] load error', e?.message || e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadToday();
  }, [loadToday]);

  async function pickCamera() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (perm.status !== 'granted') {
      showAlert('Permissão', 'Permita o acesso à câmera para fotografar o atestado.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: Platform.OS === 'web' ? 0.4 : 0.8,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      let uri = result.assets[0].uri;
      if (Platform.OS === 'web') {
        uri = await ensurePersistablePhotoUri(uri, { compress: true });
      }
      setLocalUri(uri);
      setContentType(result.assets[0].mimeType || 'image/jpeg');
    }
  }

  async function pickGallery() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') {
      showAlert('Permissão', 'Permita o acesso à galeria para anexar o atestado.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: Platform.OS === 'web' ? 0.4 : 0.8,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      let uri = result.assets[0].uri;
      if (Platform.OS === 'web') {
        uri = await ensurePersistablePhotoUri(uri, { compress: true });
      }
      setLocalUri(uri);
      setContentType(result.assets[0].mimeType || 'image/jpeg');
    }
  }

  function pickPdfWeb() {
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      showAlert('PDF', 'No celular, fotografe o atestado. PDF está disponível no navegador.');
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf,image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = String(reader.result || '');
        setLocalUri(dataUrl);
        setContentType(file.type || 'application/pdf');
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }

  async function handleSubmit() {
    if (!localUri && !existing?.documentUrl) {
      showAlert('Documento', 'Anexe a foto ou o PDF do atestado / comprovante.');
      return;
    }
    if (reason === 'OTHER' && !note.trim()) {
      showAlert('Observação', 'Descreva o motivo da falta.');
      return;
    }

    setSaving(true);
    try {
      let documentUrl = existing?.documentUrl || '';
      if (localUri) {
        documentUrl = await dayAbsenceService.uploadDocument(localUri, contentType);
      }
      const absence = await dayAbsenceService.upsert({
        date,
        reason,
        note: note.trim() || undefined,
        documentUrl,
      });
      setExisting(absence);
      setLocalUri(null);
      showAlert('Registrado', 'Falta justificada com sucesso para este dia.');
      navigation.goBack();
    } catch (e: any) {
      console.error('[JustifyAbsence] save error', e);
      showAlert(
        'Erro',
        e?.response?.data?.message || e?.message || 'Não foi possível registrar a falta.'
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove() {
    if (!existing) return;
    setSaving(true);
    try {
      await dayAbsenceService.remove(existing.date);
      setExisting(null);
      setNote('');
      setLocalUri(null);
      showAlert('Removido', 'Justificativa do dia removida.');
    } catch (e: any) {
      showAlert('Erro', e?.response?.data?.message || 'Não foi possível remover.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={[screenStyles.root, styles.centered]}>
        <ActivityIndicator color={colors.primary[500]} />
      </View>
    );
  }

  const previewIsImage =
    contentType.startsWith('image/') ||
    (!!localUri && !localUri.includes('application/pdf') && !localUri.endsWith('.pdf'));

  return (
    <ScrollView style={[screenStyles.root, flexScroll]} contentContainerStyle={styles.content}>
      <ScreenHeader
        eyebrow={date.split('-').reverse().join('/')}
        title="Justificar falta"
        subtitle="Envie o atestado ou comprovante e registre o motivo da ausência no dia"
      />

      {existing ? (
        <Card style={styles.banner} variant="primary" shadow>
          <View style={styles.bannerRow}>
            <Badge variant="accent" size="sm">
              Já registrado
            </Badge>
            <Text style={styles.bannerText}>
              Você já justificou falta neste dia. Pode atualizar o documento ou o motivo.
            </Text>
          </View>
        </Card>
      ) : null}

      <Section title="Motivo">
        <View style={styles.reasonList}>
          {DAY_ABSENCE_REASONS.map((r) => (
            <TouchableOpacity
              key={r.code}
              style={[styles.reasonChip, reason === r.code && styles.reasonChipActive]}
              onPress={() => setReason(r.code)}
            >
              <Text
                style={[styles.reasonChipText, reason === r.code && styles.reasonChipTextActive]}
              >
                {r.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Section>

      <Section title="Observação">
        <TextInput
          style={styles.note}
          placeholder="Opcional — obrigatório se escolher Outro"
          placeholderTextColor={colors.text.tertiary}
          value={note}
          onChangeText={setNote}
          multiline
          numberOfLines={3}
        />
      </Section>

      <Section title="Documento (atestado / comprovante)">
        <View style={styles.docActions}>
          <Button variant="outline" size="md" onPress={pickCamera} style={styles.docBtn}>
            Tirar foto
          </Button>
          <Button variant="outline" size="md" onPress={pickGallery} style={styles.docBtn}>
            Galeria
          </Button>
          <Button variant="outline" size="md" onPress={pickPdfWeb} style={styles.docBtn}>
            PDF / arquivo
          </Button>
        </View>

        {localUri && previewIsImage ? (
          <Image source={{ uri: localUri }} style={styles.preview} resizeMode="cover" />
        ) : null}
        {localUri && !previewIsImage ? (
          <Card style={styles.pdfCard}>
            <Text style={styles.pdfText}>PDF selecionado — pronto para enviar</Text>
          </Card>
        ) : null}
        {!localUri && existing?.documentUrl ? (
          <Card style={styles.pdfCard}>
            <Text style={styles.pdfText}>Documento já anexado. Envie outro para substituir.</Text>
            {existing.documentUrl.match(/\.(jpg|jpeg|png|webp)/i) ? (
              <Image
                source={{ uri: existing.documentUrl }}
                style={styles.preview}
                resizeMode="cover"
              />
            ) : null}
          </Card>
        ) : null}
      </Section>

      <Button variant="primary" size="lg" onPress={handleSubmit} disabled={saving} style={styles.full}>
        {saving ? 'Salvando…' : existing ? 'Atualizar justificativa' : 'Registrar falta do dia'}
      </Button>

      {existing ? (
        <Button variant="danger" size="md" onPress={handleRemove} disabled={saving} style={styles.full}>
          Remover justificativa
        </Button>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: layout.screenPaddingHorizontal,
    paddingTop: theme.spacing.lg,
    paddingBottom: layout.screenPaddingBottom,
    gap: layout.sectionGap,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  banner: {
    padding: theme.spacing.md,
  },
  bannerRow: {
    gap: theme.spacing.sm,
  },
  bannerText: {
    color: colors.text.secondary,
    fontSize: theme.typography.fontSize.sm,
    marginTop: theme.spacing.sm,
  },
  reasonList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  reasonChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: colors.dark.border,
    backgroundColor: colors.dark.card,
  },
  reasonChipActive: {
    backgroundColor: colors.primary[600],
    borderColor: colors.primary[500],
  },
  reasonChipText: {
    color: colors.text.secondary,
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  reasonChipTextActive: {
    color: colors.text.primary,
  },
  note: {
    minHeight: 88,
    borderWidth: 1,
    borderColor: colors.dark.border,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    color: colors.text.primary,
    backgroundColor: colors.dark.card,
    textAlignVertical: 'top',
  },
  docActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  docBtn: {
    flexGrow: 1,
  },
  preview: {
    width: '100%',
    height: 220,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: colors.dark.cardElevated,
  },
  pdfCard: {
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  pdfText: {
    color: colors.text.secondary,
    fontSize: theme.typography.fontSize.sm,
  },
  full: {
    width: '100%',
  },
});
