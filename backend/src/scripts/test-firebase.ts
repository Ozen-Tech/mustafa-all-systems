import 'dotenv/config';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Script de teste para verificar conexão e operações do Firebase Storage
 */

async function testFirebaseStorage() {
  console.log('🧪 Iniciando teste do Firebase Storage...\n');

  // 1. Verificar variáveis de ambiente
  console.log('📋 Verificando variáveis de ambiente...');
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;

  console.log(`   FIREBASE_PROJECT_ID: ${projectId ? '✅' : '❌'} ${projectId || '(não configurado)'}`);
  console.log(`   FIREBASE_CLIENT_EMAIL: ${clientEmail ? '✅' : '❌'} ${clientEmail || '(não configurado)'}`);
  console.log(`   FIREBASE_PRIVATE_KEY: ${privateKey ? '✅' : '❌'} ${privateKey ? `(${privateKey.length} caracteres)` : '(não configurado)'}`);
  console.log(`   FIREBASE_STORAGE_BUCKET: ${storageBucket ? '✅' : '❌'} ${storageBucket || '(não configurado)'}\n`);

  if (!projectId || !clientEmail || !privateKey || !storageBucket) {
    console.error('❌ Variáveis de ambiente não configuradas!');
    process.exit(1);
  }

  // Verificar formato da chave privada
  if (!privateKey.startsWith('"') || !privateKey.endsWith('"')) {
    console.warn('⚠️  FIREBASE_PRIVATE_KEY não está entre aspas duplas!');
    console.warn('   Deve começar e terminar com: "');
  }

  // 2. Inicializar Firebase Admin
  console.log('🔥 Inicializando Firebase Admin...');
  try {
    if (getApps().length === 0) {
      const app = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/^"|"$/g, '').replace(/\\n/g, '\n'), // Remove aspas e converte \n
        }),
        storageBucket,
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
    const bucket = storage.bucket(storageBucket);
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
    const bucket = storage.bucket(storageBucket);
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
    }
    process.exit(1);
  }

  // 6. Testar upload de arquivo
  console.log('📤 Testando upload de arquivo...');
  try {
    const bucket = storage.bucket(storageBucket);
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

    // 7. Verificar se arquivo existe
    console.log('🔍 Verificando se arquivo existe...');
    const [exists] = await file.exists();
    if (exists) {
      console.log('✅ Arquivo encontrado no bucket!\n');
    } else {
      console.error('❌ Arquivo não encontrado no bucket\n');
    }

    // 8. Testar download/leitura
    console.log('📥 Testando download do arquivo...');
    const [contents] = await file.download();
    const downloadedContent = contents.toString();
    console.log('✅ Arquivo baixado com sucesso!');
    console.log(`   Conteúdo: ${downloadedContent.substring(0, 50)}...\n`);

    // 9. Testar geração de URL pública
    console.log('🌐 Testando geração de URL pública...');
    const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${storageBucket}/o/${encodeURIComponent(testKey)}?alt=media`;
    console.log('✅ URL pública gerada:');
    console.log(`   ${publicUrl}\n`);

    // 10. Limpar arquivo de teste
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
      console.error('   Adicione a role "Storage Admin" no Google Cloud Console');
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

