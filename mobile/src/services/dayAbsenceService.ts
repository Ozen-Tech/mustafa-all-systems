import { Platform } from 'react-native';
import { apiClient } from './apiClient';

export type DayAbsenceReason = 'MEDICAL_CERTIFICATE' | 'PERSONAL' | 'OTHER';

export interface DayAbsence {
  id: string;
  promoterId: string;
  date: string;
  reason: DayAbsenceReason;
  note: string | null;
  documentUrl: string;
  createdAt: string;
  updatedAt: string;
}

export const DAY_ABSENCE_REASONS: Array<{ code: DayAbsenceReason; label: string }> = [
  { code: 'MEDICAL_CERTIFICATE', label: 'Atestado médico' },
  { code: 'PERSONAL', label: 'Motivo pessoal' },
  { code: 'OTHER', label: 'Outro' },
];

async function uriToBlob(uri: string): Promise<Blob> {
  const res = await fetch(uri);
  return res.blob();
}

export const dayAbsenceService = {
  async getToday(): Promise<{ date: string; absence: DayAbsence | null }> {
    const { data } = await apiClient.get('/promoters/day-absences/today');
    return data;
  },

  async list(from?: string, to?: string): Promise<DayAbsence[]> {
    const { data } = await apiClient.get('/promoters/day-absences', {
      params: { from, to },
    });
    return data.absences || [];
  },

  async upsert(payload: {
    date?: string;
    reason: DayAbsenceReason;
    note?: string;
    documentUrl: string;
  }): Promise<DayAbsence> {
    const { data } = await apiClient.post('/promoters/day-absences', payload);
    return data.absence;
  },

  async remove(date: string): Promise<void> {
    await apiClient.delete(`/promoters/day-absences/${date}`);
  },

  /** Upload imagem/PDF e retorna URL pública. */
  async uploadDocument(uri: string, contentTypeHint?: string): Promise<string> {
    const isPdf =
      contentTypeHint === 'application/pdf' ||
      uri.toLowerCase().includes('.pdf') ||
      uri.startsWith('data:application/pdf');

    // Prefer multipart when possível (web File / blob)
    if (Platform.OS === 'web' || uri.startsWith('blob:') || uri.startsWith('data:')) {
      try {
        let blob: Blob;
        let contentType = contentTypeHint || (isPdf ? 'application/pdf' : 'image/jpeg');

        if (uri.startsWith('data:')) {
          const match = uri.match(/^data:([^;]+);base64,(.+)$/);
          if (!match) throw new Error('Data URL inválida');
          contentType = contentTypeHint || match[1] || contentType;
          const { data } = await apiClient.post('/promoters/day-absences/upload-base64', {
            fileBase64: uri,
            contentType,
          });
          return data.url as string;
        }

        blob = await uriToBlob(uri);
        contentType = contentTypeHint || blob.type || contentType;

        const form = new FormData();
        const ext = contentType === 'application/pdf' ? 'pdf' : 'jpg';
        form.append('file', blob, `atestado.${ext}`);

        const { data } = await apiClient.post('/promoters/day-absences/upload', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 60_000,
        });
        return data.url as string;
      } catch (multipartError) {
        console.warn('[dayAbsence] multipart falhou, tentando base64:', multipartError);
      }
    }

    // Native: FormData com uri
    const form = new FormData();
    const contentType = contentTypeHint || (isPdf ? 'application/pdf' : 'image/jpeg');
    const ext = contentType === 'application/pdf' ? 'pdf' : 'jpg';
    form.append('file', {
      uri,
      name: `atestado.${ext}`,
      type: contentType,
    } as any);

    const { data } = await apiClient.post('/promoters/day-absences/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60_000,
    });
    return data.url as string;
  },
};
