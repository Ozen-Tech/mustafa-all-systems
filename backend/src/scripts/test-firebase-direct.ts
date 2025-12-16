import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';

/**
 * Script de teste direto - usa variáveis hardcoded para teste rápido
 */

// Variáveis do Render (use as mesmas do Render Dashboard)
const FIREBASE_PROJECT_ID = 'mustafabucket';
const FIREBASE_CLIENT_EMAIL = 'firebase-adminsdk-fbsvc@mustafabucket.iam.gserviceaccount.com';
const FIREBASE_STORAGE_BUCKET = 'mustafabucket.firebasestorage.app';
const FIREBASE_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDT/cuApM39Hd7w
z4WwcY43LxX73pdXDJ2/9PYSiKATSVd8aFzDquPtpcJacOgOGwAHe6Ik05zW75Up
IJ+yqe/Dyz/OOsgRcPpswMiGy0i6qT96j2vGZNfxv+cAVUzihX6UqUN3M5Z5Jm50
8TwzPrD3rUEi3TlkXVhbnp5JzKZZ7C9BRID8a1cyyJ2OJ5nFSiWRAtCVIBfb9QxJ
S+kupblKH0UIAp0uFEaw8Wd52js9mKsSe35jXfBhgQpNLQMah5TzFRO8dSSm6zuF
/TBmOk2z8rO49UCrCRvPbN4/ULv8KSZwAV1ufUgz58XBLzXmSS0oSAtVbw1V8pzB
UfuxzvAzAgMBAAECggEAFzRcVowzoWA9VgixLpDPgLTeaCqDpbCo19PdgkaC7HmG
YloeGquVtXQDzoM2CM07IevjjLppHDyEtvLDkvqiVxaOuRPwGxCjKM0AENkm8Ipe
0MXq2yrmBFKoMNN6zf96IpWrNTISvNd7FxaM1g3SWy9oxi3cVA3FAopd8zVmhB3G
Po87/TiEe2mgiW1Seg+OtLFOUY9Inh3hW+0ClHKIKKLBuYZ+tzXPCP+IVC2Z1RBd
X76gYfpwHL40KKtlbF3+gTRqEqk014+LJNQxUMk7qRKNFYu2ouvggXaLWWPlzF5S
cVPa16IC5B+XYpzP9Q1azOQfjcJLdEnmUQG36K/eOQKBgQDx3AptdB7spV4YPtAP
D9WbSD4quUR9DNadYjCeE0Y0eoJ1zF+EgNx15QpEQAP07BIOq2/w9nNMe8otF2Wp
o75Xiln9LEOrOdcMkmwPkoyk/l/5WHVCqSfLhq3Pam1LtcQyId4mZ7ORMzz7OufJ
EcQ6eYqCXX9oYD8UDxNRmZew3wKBgQDgYrY1ZOdUA2DjJoWp33Teox/32K8fJHxp
0YbzvjRmeMqU9Zz5PF8xQD42O67sqchID37KRb1Z8wadNKcS9O7w2voKVQcVyXfd
eo4pP+H7j7n6JP6lwb7uxAo4Ma/syT0u18evnbu+Lr6UJ8yMrcnvNlaZu7cfNhof
KftyX8lHLQKBgE9c1esenHsotFyeV+VpW71tkkCwtIGYMeBI9Q0Z5AKaZK7E1l8D
bdQdySWmH+ZBhJdduAjIxgLF6AytzcVBntbY5jiGStony6IrddwSSaZmdhW66hdq
rE1Dr0sNcDnUtkGBDYVqp+iweIUzyhUXiF1rvoCSr5kPZANwAvXWwYjfAoGADCXL
74AS9f1o1WNUgSnTzenO5UAZ2vnCsofhYni9pX6MmRvi76tRC/2KYK1CfxWB/kS4
fILiCWiaxw/+q4wPE4MHXl/UDl3l21uzLpCCz3esfdpa3uZqS8rZMsmd2JfcdBjC
esNzUox9TNAKxuLxt72dWp1LAKmRKHbBYiPFZdECgYALday8JHkB5MwCZTjv4GSh
KhFJ+zoSE1B64V/W9o5ulaUzf9glZnojeXTkrZCEJoMtiIjJzzP56RKJIS8YsAhL
54sLYf0Ys0sUy9bS4HrsgQrXNti+3EuoMWkeVsP5g31WyRLBecuiUh0LJ5s8+5GD
BM1vR5uONY5nc7pvjbz3cw==
-----END PRIVATE KEY-----`;

async function testFirebaseStorage() {
  console.log('🧪 Iniciando teste do Firebase Storage...\n');

  // 1. Verificar variáveis
  console.log('📋 Variáveis configuradas:');
  console.log(`   FIREBASE_PROJECT_ID: ✅ ${FIREBASE_PROJECT_ID}`);
  console.log(`   FIREBASE_CLIENT_EMAIL: ✅ ${FIREBASE_CLIENT_EMAIL}`);
  console.log(`   FIREBASE_STORAGE_BUCKET: ✅ ${FIREBASE_STORAGE_BUCKET}`);
  console.log(`   FIREBASE_PRIVATE_KEY: ✅ ${FIREBASE_PRIVATE_KEY.length} caracteres\n`);

  // 2. Inicializar Firebase Admin
  console.log('🔥 Inicializando Firebase Admin...');
  try {
    if (getApps().length === 0) {
      const app = initializeApp({
        credential: cert({
          projectId: FIREBASE_PROJECT_ID,
          clientEmail: FIREBASE_CLIENT_EMAIL,
          privateKey: FIREBASE_PRIVATE_KEY,
        }),
        storageBucket: FIREBASE_STORAGE_BUCKET,
      });
      console.log('✅ Firebase App inicializado com sucesso!\n');
    } else {
      console.log('✅ Firebase App já estava inicializado\n');
    }
  } catch (error: any) {
    console.error('❌ Erro ao inicializar Firebase App:');
    console.error(`   Código: ${error.code || 'N/A'}`);
    console.error(`   Mensagem: ${error.message}`);
    if (error.code === 403 || error.code === 412) {
      console.error('\n🚨 ERRO DE PERMISSÃO!');
      console.error('   Verifique as permissões da service account no Google Cloud Console');
    }
    process.exit(1);
  }

  // 3. Obter Storage
  console.log('📦 Obtendo Storage...');
  const storage = getStorage();
  console.log('✅ Storage obtido\n');

  // 4. Testar acesso ao bucket
  console.log('🔍 Testando acesso ao bucket...');
  try {
    const bucket = storage.bucket(FIREBASE_STORAGE_BUCKET);
    const [metadata] = await bucket.getMetadata();
    console.log('✅ Bucket acessível!');
    console.log(`   Nome: ${metadata.name}`);
    console.log(`   Localização: ${metadata.location || 'N/A'}`);
    console.log(`   Criado em: ${metadata.timeCreated || 'N/A'}\n`);
  } catch (error: any) {
    console.error('❌ Erro ao acessar bucket:');
    console.error(`   Código: ${error.code || 'N/A'}`);
    console.error(`   Mensagem: ${error.message}`);
    if (error.code === 403 || error.code === 412) {
      console.error('\n🚨 ERRO DE PERMISSÃO!');
      console.error('   A service account não tem permissões para acessar o bucket');
      console.error('   Adicione a role "Storage Admin" no Google Cloud Console');
    }
    process.exit(1);
  }

  // 5. Testar geração de presigned URL
  console.log('🔗 Testando geração de presigned URL...');
  try {
    const bucket = storage.bucket(FIREBASE_STORAGE_BUCKET);
    const testKey = `test/test-${Date.now()}.txt`;
    const file = bucket.file(testKey);

    const [url] = await file.getSignedUrl({
      action: 'write',
      expires: Date.now() + 3600 * 1000, // 1 hora
      contentType: 'text/plain',
    });

    console.log('✅ Presigned URL gerada com sucesso!');
    console.log(`   Key: ${testKey}`);
    console.log(`   URL: ${url.substring(0, 100)}...\n`);
  } catch (error: any) {
    console.error('❌ Erro ao gerar presigned URL:');
    console.error(`   Código: ${error.code || 'N/A'}`);
    console.error(`   Mensagem: ${error.message}`);
    if (error.code === 403 || error.code === 412) {
      console.error('\n🚨 ERRO DE PERMISSÃO!');
      console.error('   A service account não tem permissões para gerar presigned URLs');
      console.error('   Adicione a role "Storage Admin" no Google Cloud Console');
      console.error('\n📋 Passos:');
      console.error('   1. Acesse: https://console.cloud.google.com/');
      console.error('   2. Selecione o projeto: mustafabucket');
      console.error('   3. Vá em IAM & Admin > IAM');
      console.error('   4. Encontre: firebase-adminsdk-fbsvc@mustafabucket.iam.gserviceaccount.com');
      console.error('   5. Adicione a role: Storage Admin');
    }
    process.exit(1);
  }

  // 6. Testar upload
  console.log('📤 Testando upload de arquivo...');
  try {
    const bucket = storage.bucket(FIREBASE_STORAGE_BUCKET);
    const testKey = `test/upload-test-${Date.now()}.txt`;
    const file = bucket.file(testKey);
    const testContent = `Teste de upload - ${new Date().toISOString()}`;

    await file.save(testContent, {
      metadata: {
        contentType: 'text/plain',
      },
    });

    console.log('✅ Arquivo enviado com sucesso!');
    console.log(`   Key: ${testKey}\n`);

    // 7. Verificar existência
    console.log('🔍 Verificando se arquivo existe...');
    const [exists] = await file.exists();
    if (exists) {
      console.log('✅ Arquivo encontrado no bucket!\n');
    } else {
      console.error('❌ Arquivo não encontrado no bucket\n');
    }

    // 8. Testar download
    console.log('📥 Testando download do arquivo...');
    const [contents] = await file.download();
    const downloadedContent = contents.toString();
    console.log('✅ Arquivo baixado com sucesso!');
    console.log(`   Conteúdo: ${downloadedContent.substring(0, 50)}...\n`);

    // 9. Limpar
    console.log('🧹 Limpando arquivo de teste...');
    await file.delete();
    console.log('✅ Arquivo de teste removido\n');

    console.log('🎉 TODOS OS TESTES PASSARAM!');
    console.log('✅ Firebase Storage está funcionando corretamente!\n');

  } catch (error: any) {
    console.error('❌ Erro ao testar upload/download:');
    console.error(`   Código: ${error.code || 'N/A'}`);
    console.error(`   Mensagem: ${error.message}`);
    if (error.code === 403 || error.code === 412) {
      console.error('\n🚨 ERRO DE PERMISSÃO!');
      console.error('   A service account não tem permissões para fazer upload');
    }
    process.exit(1);
  }
}

// Executar teste
testFirebaseStorage()
  .then(() => {
    console.log('✅ Teste concluído com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erro fatal no teste:');
    console.error(error);
    process.exit(1);
  });

