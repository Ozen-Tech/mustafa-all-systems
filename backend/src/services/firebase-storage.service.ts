import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import { v4 as uuidv4 } from 'uuid';

// Initialize Firebase Admin (only if credentials are provided)
let storage: ReturnType<typeof getStorage> | null = null;
let bucketName: string | null = null;

const hasFirebaseCredentials = 
  process.env.FIREBASE_PROJECT_ID && 
  process.env.FIREBASE_CLIENT_EMAIL &&
  process.env.FIREBASE_PRIVATE_KEY &&
  process.env.FIREBASE_STORAGE_BUCKET;

if (hasFirebaseCredentials) {
  try {
    if (getApps().length === 0) {
      const app = initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      });
      
      console.log('✅ Firebase App inicializado');
      console.log('📦 Bucket configurado:', process.env.FIREBASE_STORAGE_BUCKET);
    }
    
    storage = getStorage();
    bucketName = process.env.FIREBASE_STORAGE_BUCKET || null;
    
    console.log('✅ Firebase Storage inicializado');
    console.log('📦 Bucket configurado:', bucketName);
    
    // Verificar bucket de forma assíncrona (sem bloquear inicialização)
    if (storage && bucketName) {
      verifyBucketAccess().catch((error) => {
        console.error('❌ Erro ao verificar bucket (não crítico):', error.message);
      });
    }
  } catch (error: any) {
    console.error('❌ Erro ao inicializar Firebase Storage:', error);
    console.error('❌ Detalhes:', error.message);
    console.error('❌ Código:', error.code);
    console.error('❌ Stack:', error.stack);
    
    if (error.code === 403 || error.code === 412) {
      console.error('');
      console.error('🚨 ERRO DE PERMISSÃO: Verifique as permissões da conta de serviço!');
      console.error('📖 Veja: docs/SOLUCAO_ERRO_412_FIREBASE.md');
      console.error('');
    }
  }
} else {
  console.error('❌ Firebase credentials não configuradas!');
  console.error('❌ Variáveis necessárias:');
  console.error('   - FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID ? '✅' : '❌');
  console.error('   - FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL ? '✅' : '❌');
  console.error('   - FIREBASE_PRIVATE_KEY:', process.env.FIREBASE_PRIVATE_KEY ? '✅' : '❌');
  console.error('   - FIREBASE_STORAGE_BUCKET:', process.env.FIREBASE_STORAGE_BUCKET ? '✅' : '❌');
  console.warn('⚠️  Usando URLs mockadas - uploads NÃO funcionarão!');
}

/**
 * Verifica se o bucket está acessível (chamada assíncrona)
 */
async function verifyBucketAccess(): Promise<void> {
  if (!storage || !bucketName) return;
  
  try {
    const bucket = storage.bucket(bucketName);
    // Tentar acessar metadados do bucket para verificar permissões
    const [metadata] = await bucket.getMetadata().catch(() => [null]);
    
    if (metadata) {
      console.log('✅ Bucket verificado e acessível');
      console.log('📦 Bucket location:', metadata.location || 'N/A');
    } else {
      console.warn('⚠️  Bucket configurado mas não foi possível verificar metadados');
      console.warn('⚠️  Isso pode indicar problema de permissões');
    }
  } catch (bucketError: any) {
    console.error('❌ Erro ao acessar bucket:', bucketError.message);
    console.error('❌ Código:', bucketError.code);
    if (bucketError.code === 403 || bucketError.code === 412) {
      console.error('');
      console.error('🚨 ERRO DE PERMISSÃO: A conta de serviço não tem acesso ao bucket!');
      console.error('📋 SOLUÇÃO:');
      console.error('1. Acesse: https://console.cloud.google.com/');
      console.error('2. Vá em IAM & Admin > Service Accounts');
      console.error(`3. Encontre: ${process.env.FIREBASE_CLIENT_EMAIL}`);
      console.error('4. Adicione a role: Storage Admin');
      console.error('5. Aguarde 5-10 minutos e reinicie o serviço');
      console.error('');
    }
  }
}

export interface PresignedUrlOptions {
  contentType: string;
  expiresIn?: number;
}

/**
 * Obtém o bucket correto, tentando diferentes formatos se necessário
 */
function getBucket(): any {
  if (!storage) return null;
  
  // Tentar usar o bucket name explícito primeiro
  if (bucketName) {
    try {
      return storage.bucket(bucketName);
    } catch (e) {
      console.warn(`⚠️  Erro ao usar bucket explícito "${bucketName}", tentando bucket padrão...`);
    }
  }
  
  // Fallback: usar bucket padrão da inicialização
  try {
    return storage.bucket();
  } catch (e) {
    console.error('❌ Erro ao obter bucket padrão:', e);
    return null;
  }
}

/**
 * Gera URL de upload para Firebase Storage
 * Retorna uma URL que pode ser usada para upload direto
 */
export async function getPresignedUploadUrl(
  key: string,
  options: PresignedUrlOptions
): Promise<string> {
  if (!storage || !hasFirebaseCredentials) {
    // Retornar URL mockada para desenvolvimento
    const mockUrl = `https://mock-storage.local/photos/${key}?upload=true`;
    console.error(`❌ [Firebase Mock] Firebase não configurado! Retornando URL mockada para key: ${key}`);
    console.error(`❌ [Firebase Mock] Configure as variáveis de ambiente no Render!`);
    return mockUrl;
  }

  const bucket = getBucket();
  if (!bucket) {
    throw new Error('Não foi possível obter o bucket do Firebase Storage');
  }

  try {
    const file = bucket.file(key);

    console.log(`📸 Gerando presigned URL para upload: ${key}`);
    console.log(`📸 Bucket: ${bucket.name}`);
    console.log(`📸 Content-Type: ${options.contentType}`);

    // Criar URL assinada para upload (válida por 1 hora por padrão)
    const [url] = await file.getSignedUrl({
      action: 'write',
      expires: Date.now() + (options.expiresIn || 3600) * 1000,
      contentType: options.contentType,
    });

    console.log(`✅ Presigned URL gerada com sucesso para: ${key}`);
    return url;
  } catch (error: any) {
    console.error('❌ Erro ao gerar presigned URL do Firebase:', error);
    console.error('❌ Mensagem:', error.message);
    console.error('❌ Código:', error.code);
    console.error('❌ Stack:', error.stack);
    
    // Tratamento específico para erro 412 (permissões)
    if (error.code === 412 || error.code === 403 || error.message?.includes('412') || error.message?.includes('403') || error.message?.includes('missing necessary permissions')) {
      console.error('');
      console.error('🚨 ERRO 412/403: Conta de serviço sem permissões necessárias!');
      console.error('');
      console.error('📋 SOLUÇÃO PASSO A PASSO:');
      console.error('1. Acesse: https://console.cloud.google.com/');
      console.error('2. Selecione o projeto: mustafabucket');
      console.error('3. Vá em IAM & Admin > Service Accounts');
      console.error(`4. Encontre: ${process.env.FIREBASE_CLIENT_EMAIL}`);
      console.error('5. Clique nela > Permissions > Grant Access');
      console.error('6. Adicione a role: Storage Admin (roles/storage.admin)');
      console.error('7. Clique em Save');
      console.error('8. Aguarde 5-10 minutos para propagação');
      console.error('9. Reinicie o serviço no Render');
      console.error('');
      console.error('💡 DICA: Verifique também se FIREBASE_STORAGE_BUCKET está correto no Render');
      console.error('   Deve ser: mustafabucket.firebasestorage.app');
      console.error('');
      console.error('📖 Veja mais detalhes em: docs/SOLUCAO_ERRO_412_FIREBASE.md');
      console.error('');
    }
    
    throw error;
  }
}

/**
 * Gera URL de download para Firebase Storage
 */
export async function getPresignedDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
  if (!storage || !hasFirebaseCredentials) {
    const mockUrl = `https://mock-storage.local/photos/${key}?download=true`;
    console.log(`📸 [Firebase Mock] Generated mock download URL for key: ${key}`);
    return mockUrl;
  }

  const bucket = getBucket();
  if (!bucket) {
    throw new Error('Não foi possível obter o bucket do Firebase Storage');
  }

  try {
    const file = bucket.file(key);

    // Criar URL assinada para download
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + expiresIn * 1000,
    });

    return url;
  } catch (error: any) {
    console.error('❌ Erro ao gerar download URL do Firebase:', error);
    console.error('❌ Mensagem:', error.message);
    console.error('❌ Código:', error.code);
    
    // Tratamento específico para erro 412 (permissões)
    if (error.code === 412 || error.code === 403 || error.message?.includes('412') || error.message?.includes('403') || error.message?.includes('missing necessary permissions')) {
      console.error('');
      console.error('🚨 ERRO 412/403: Conta de serviço sem permissões necessárias!');
      console.error('📖 Veja: docs/SOLUCAO_ERRO_412_FIREBASE.md');
      console.error('');
    }
    
    throw error;
  }
}

/**
 * Gera URL pública (se o arquivo for público)
 * Formato: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{encodedKey}?alt=media
 */
export function getPublicUrl(key: string): string {
  const bucket = bucketName || process.env.FIREBASE_STORAGE_BUCKET || 'promo-gestao-photos';
  // Firebase Storage requer encoding específico: / vira %2F
  const encodedKey = encodeURIComponent(key);
  const url = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodedKey}?alt=media`;
  console.log(`📸 URL pública gerada para key "${key}": ${url.substring(0, 100)}...`);
  return url;
}

/**
 * Gera URL assinada para download (fallback quando pública não funciona)
 * Tenta gerar URL assinada, se falhar por erro 412, retorna URL pública
 */
export async function getSignedUrlForPhoto(key: string): Promise<string> {
  if (!storage || !hasFirebaseCredentials) {
    return getPublicUrl(key); // Fallback para URL pública se Firebase não configurado
  }

  const bucket = getBucket();
  if (!bucket) {
    console.warn('⚠️  Não foi possível obter bucket, usando URL pública');
    return getPublicUrl(key);
  }

  try {
    const file = bucket.file(key);
    
    // Verificar se arquivo existe
    const [exists] = await file.exists();
    if (!exists) {
      console.warn(`⚠️ Arquivo não existe no bucket: ${key}`);
      return getPublicUrl(key); // Retornar URL pública mesmo assim
    }

    // Criar URL assinada válida por 1 ano
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + (365 * 24 * 60 * 60 * 1000), // 1 ano
    });
    
    console.log(`📸 URL assinada gerada para key "${key}"`);
    return url;
  } catch (error: any) {
    console.error(`❌ Erro ao gerar URL assinada para ${key}:`, error);
    console.error('❌ Código:', error.code);
    console.error('❌ Mensagem:', error.message);
    
    // Tratamento específico para erro 412 (permissões)
    if (error.code === 412 || error.code === 403 || error.message?.includes('412') || error.message?.includes('403') || error.message?.includes('missing necessary permissions')) {
      console.error('');
      console.error('🚨 ERRO 412/403: Conta de serviço sem permissões necessárias!');
      console.error('⚠️  Usando URL pública como fallback, mas uploads NÃO funcionarão!');
      console.error('');
      console.error('📋 SOLUÇÃO URGENTE:');
      console.error('1. Acesse: https://console.cloud.google.com/');
      console.error('2. Selecione o projeto: mustafabucket');
      console.error('3. Vá em IAM & Admin > Service Accounts');
      console.error(`4. Encontre: ${process.env.FIREBASE_CLIENT_EMAIL}`);
      console.error('5. Adicione a role: Storage Admin');
      console.error('6. Aguarde 5-10 minutos e reinicie o serviço');
      console.error('');
      console.error('📖 Veja: docs/SOLUCAO_ERRO_412_FIREBASE.md');
      console.error('');
    }
    
    // Fallback para URL pública em caso de erro
    // Mesmo com erro 412, a URL pública pode funcionar se as regras permitirem
    return getPublicUrl(key);
  }
}

/**
 * Envia buffer para Firebase Storage via presigned URL (PUT server-side, sem CORS).
 * Reutiliza o mesmo fluxo que funciona no app nativo.
 */
export async function uploadPhotoBuffer(
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<void> {
  const presignedUrl = await getPresignedUploadUrl(key, { contentType });

  const response = await fetch(presignedUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: buffer,
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(
      `Upload GCS falhou (${response.status}): ${body.slice(0, 300) || response.statusText}`
    );
  }

  console.log(`✅ Foto enviada via backend: ${key}`);
}

/**
 * Gera chave única para foto
 */
export function generatePhotoKey(visitId: string, type: string, extension: string = 'jpg'): string {
  const timestamp = Date.now();
  const uuid = uuidv4();
  return `photos/${visitId}/${type}-${timestamp}-${uuid}.${extension}`;
}

/**
 * Deleta foto do Firebase Storage
 */
export async function deletePhoto(key: string): Promise<void> {
  if (!storage || !hasFirebaseCredentials) {
    console.log(`📸 [Firebase Mock] Would delete photo: ${key} (mock mode)`);
    return;
  }

  const bucket = getBucket();
  if (!bucket) {
    throw new Error('Não foi possível obter o bucket do Firebase Storage');
  }

  try {
    const file = bucket.file(key);
    await file.delete();
    console.log(`✅ Foto deletada: ${key}`);
  } catch (error) {
    console.error(`Erro ao deletar foto ${key}:`, error);
    throw error;
  }
}
