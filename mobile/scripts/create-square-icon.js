/**
 * Script para criar um ícone quadrado a partir do logo atual
 * 
 * Uso: node scripts/create-square-icon.js
 * 
 * Requer: npm install sharp --save-dev
 */

const fs = require('fs');
const path = require('path');

const logoPath = path.join(__dirname, '../assets/images/logo.png');
const outputPath = path.join(__dirname, '../assets/images/icon-square.png');

console.log('🔧 Criando ícone quadrado...');

// Verificar se sharp está disponível
let sharp;
try {
  sharp = require('sharp');
} catch (error) {
  console.error('❌ Erro: sharp não está instalado.');
  console.log('📦 Instalando sharp...');
  console.log('   Execute: npm install sharp --save-dev');
  console.log('');
  console.log('💡 Alternativa: Use uma ferramenta online como:');
  console.log('   https://www.iloveimg.com/resize-image');
  console.log('   Redimensione para 1024x1024 e salve como icon-square.png');
  process.exit(1);
}

// Verificar se o logo existe
if (!fs.existsSync(logoPath)) {
  console.error(`❌ Logo não encontrado em: ${logoPath}`);
  process.exit(1);
}

async function createSquareIcon() {
  try {
    // Obter metadados da imagem
    const metadata = await sharp(logoPath).metadata();
    console.log(`📐 Dimensões atuais: ${metadata.width}x${metadata.height}`);
    
    // Calcular tamanho quadrado (usar o maior lado)
    const size = Math.max(metadata.width, metadata.height);
    const targetSize = 1024; // Tamanho recomendado para ícones
    
    console.log(`🎯 Criando ícone ${targetSize}x${targetSize}...`);
    
    // Criar ícone quadrado com fundo branco
    await sharp(logoPath)
      .resize(targetSize, targetSize, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .toFile(outputPath);
    
    console.log(`✅ Ícone quadrado criado: ${outputPath}`);
    console.log('');
    console.log('📝 Próximos passos:');
    console.log('   1. Atualize app.json para usar icon-square.png');
    console.log('   2. Execute: npx expo-doctor para verificar');
    console.log('   3. Execute: eas build --platform android --profile preview');
    
  } catch (error) {
    console.error('❌ Erro ao criar ícone:', error.message);
    process.exit(1);
  }
}

createSquareIcon();

