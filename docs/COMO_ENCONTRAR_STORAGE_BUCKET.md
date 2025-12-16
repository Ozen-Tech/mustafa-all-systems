# 🔍 Como Encontrar o Storage Bucket do Firebase

## ✅ Suas Credenciais (Já Extraídas)

Com base no seu arquivo JSON, as credenciais são:

```
FIREBASE_PROJECT_ID=mustafabucket
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@mustafabucket.iam.gserviceaccount.com
FIREBASE_STORAGE_BUCKET=mustafabucket.appspot.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
```

## 📍 Onde Encontrar no Firebase Console

### Método 1: Via Storage (Mais Fácil)

1. Acesse [Firebase Console](https://console.firebase.google.com/)
2. Selecione o projeto **mustafabucket**
3. No menu lateral, clique em **Storage**
4. Na parte superior, você verá o nome do bucket
5. Geralmente é: `{project-id}.appspot.com`
   - No seu caso: **`mustafabucket.appspot.com`**

### Método 2: Via Project Settings

1. Acesse [Firebase Console](https://console.firebase.google.com/)
2. Selecione o projeto **mustafabucket**
3. Clique no ícone de **engrenagem** (⚙️) > **Project Settings**
4. Vá na aba **General**
5. Role até a seção **Your apps**
6. O Storage Bucket aparece como: **Storage bucket**
   - Formato: `{project-id}.appspot.com`
   - No seu caso: **`mustafabucket.appspot.com`**

### Método 3: Via Storage Rules

1. Acesse [Firebase Console](https://console.firebase.google.com/)
2. Selecione o projeto **mustafabucket**
3. Vá em **Storage** > **Rules**
4. No topo da página, você verá o nome do bucket

## 🎯 Resposta Rápida

**O Storage Bucket do seu projeto é:**

```
mustafabucket.appspot.com
```

Isso é baseado no `project_id` do seu JSON: `mustafabucket`

## 📋 Variáveis para o Render

Copie e cole estas variáveis no Render Dashboard:

```
FIREBASE_PROJECT_ID=mustafabucket
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@mustafabucket.iam.gserviceaccount.com
FIREBASE_STORAGE_BUCKET=mustafabucket.appspot.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEuwIBADANBgkqhkiG9w0BAQEFAASCBKUwggShAgEAAoIBAQC/xzZKctq2XXOy\nxZelkurGvskBVbWXQNFpv/X6F0VoRHmKi4M3BMSX+OpO2zidwUHQvnBZMlSNA6PF\nq4mL8QtMJLsO1CgHAd0SHYIsa+9adbtKa2u2rVK2VnR4M4TAPPJ2fMhSiYLiRxM0\nHRu9ebND+3sk2ymB7anvBj4VaHz49XPOIFJGgfQmoFZ8IBj5yI8laysoREy8lFq/\nJt85i6BAW/F6i90Xa6l7FiRsLatl0Qpnqg5oigDO+eQIHLwzcxcTxNrVSHWL2tGI\nb9c+E28JodAWu8M1UAXypbfnR1Ggi4BKyISGtxXV3zMsGkRvnKhbgsOYEjAGxfnj\nutDDlzILAgMBAAECgf9CGeHlx0857deFcaHrxVZj1S3tCubt2ddILis414+a5tqc\nL3ojDuMuENqyCktU17WCYjn1qSZvQ6EjH16Gb/Bci1ixVg1psjq9lgB5BhBJQksn\nT00B5wTwr577hjQW6g+D08fi9C1x6T5f6M0g1ycXeE2YKZDDdNI2L1IqoSJZ0UYm\nthRydKFl6fdF4+PeZOIDySzTLOBZX7AWJEqj+t93bfcsYcJvkq3sekEzctqzVCzV\nxsu13RhL/L2vdGNNns2ZQ3u/iPUMbDA0JkHP7fe4ciw7Z7DLgUDQrdGnnP15cblO\nm//vFa8SeiZ/FZt4Uv05VTTI9d0nygUjdKWI9HkCgYEA4F8NxRXYkKEAy3djru+G\nfd+2/6kbrFku40vQ+hwlC2DapgJTyBmGm0B3nmL1iajZcykKuKnEhSI9OEsql/a0\n1TcR4jMiyw0+Qn6wi2gf4J6MVbm/8dknlhwN0E/tlq6Z2annzwPtT/CUYFXX/Vy4\neZW8fieH8g6aWydg2MbKc8UCgYEA2s/2HLABlSEgE2MZMfVDVzxNqT3DHu+Witac\nOVRtYZDYvIbSmFpSjdL2bLgnh/RAEXNC4CUG16JpzokfhRhifZmjiT8s4DOY1Q+s\n1Adr+Yk+rmoW+3gwT2kYe42rTfaf10od/QSvQEJ+ZnZjr7S7D+TBBE2n/zAGOUOb\nHDYL248CgYEAvtV6A8AB83lNEMFZ4odNT7BAmJB/vgYYkDCC7MeVZmkZbwsZsV6s\nk02wr+EhT9VyJbWprciPImEtyrx73MZzpclyB39Qv31jD/FrPRbxzf1sBNm4/P2i\n4tS3lw70WC3nIy+UvwlrBYvs10cMLy12pcsKiA4dXW64MIF8qMPjm7UCgYAnMnHI\nGc9uw4xXbL0qseDqU6cl1iaJ+CljnaZGrtUZUTVCMHSxThzTwyLZvvN1608+0QL9\n3CQppLKHiRDYatHZ5hfhkiubziJmqHQxV1MEVI2h+Oc9DP66ev0jxPEW+kMP8fsF\nRD2QqVizSin5Y8rOwg/BkZeyowu6Xl3+47+kCQKBgBqfV0ijFRr8oy0yeNblWqCK\nM3Cs3qHCkb6iNDq8n1jQRmwiPcxtslD8ztWN92pJcgrb2c6xw8b9QeLow+c71o/q\nNcf/GtSdR3jkedCHngZ4yo66/pX4v3Q7i+huQPABVyXz487vNrRkI/hUbwp2CME7\nfSTl8Z4tcQtZuSWuAd6U\n-----END PRIVATE KEY-----\n"
```

⚠️ **IMPORTANTE**: 
- Mantenha as aspas no `FIREBASE_PRIVATE_KEY`
- Mantenha os `\n` (não substitua por quebras de linha reais)

## 🔗 Links Úteis

- [Firebase Console](https://console.firebase.google.com/)
- [Render Dashboard](https://dashboard.render.com/)

## ✅ Verificação

Para verificar se o bucket está correto:

1. Acesse Firebase Console > Storage
2. Se você conseguir ver arquivos ou fazer upload, o bucket está correto
3. O nome do bucket aparece no topo da página

