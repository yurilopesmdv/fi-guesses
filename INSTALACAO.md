# Bolão F1 — instalação e uso

## Android (3 aparelhos)
1. Abra no celular: https://tqbftaqkqtjouovyvrkq.supabase.co/storage/v1/object/public/site/bolao-f1.apk
   (ou aponte a câmera pro `docs/qr-apk.png`)
2. Baixar → ao abrir, o Android pede pra permitir instalar de "fonte desconhecida" → **Permitir** → **Instalar**.
3. Abrir o **Bolão F1** → **Criar conta** (nome, e-mail, senha).

Atualizações chegam sozinhas ao abrir o app. Reinstalar só se eu avisar (mudança nativa).

## iPhone (2 aparelhos)
1. App Store → **Expo Go**.
2. Câmera → apontar pro `docs/qr-expo-go.png` → "Abrir no Expo Go".
   Ou Expo Go → *Enter URL manually* →
   `exp://u.expo.dev/7efe543a-c812-4af7-9e7b-bc998f3b2f4c?channel-name=preview&runtime-version=exposdk:57.0.0`
3. Se pedir login no Expo Go: conta `yurilopesmdv`.
4. **Criar conta** no app.

O projeto fica em "Recentes" no Expo Go e sempre abre a versão mais nova. Não precisa reler QR nem logar de novo.

## Qualquer aparelho, sem instalar
https://bolao-f1.expo.app (no iPhone: Compartilhar → "Adicionar à Tela de Início").

## Convidar
Home ou aba Galera → **Convidar pelo WhatsApp**. O link abre uma página com: baixar APK (Android) / abrir no Expo Go (iPhone) / abrir no navegador — e já entra no bolão. Todos os bolões também aparecem na home em "Bolões da galera" com botão Participar.

## Tempo real (aba Ao vivo)
Sem assinatura mostra a última sessão. Pra ao vivo durante as sessões: assinar OpenF1 (€9,90/mês, https://openf1.org) e me passar usuário/senha — eu gravo em `app_settings` no banco (nunca no código).

## Publicar nova versão (eu faço)
```bash
npx eas-cli update --channel preview --environment preview --platform all --message "..."
```
Novo APK (só se mudar algo nativo): `eas build -p android --profile preview` → `node scripts/upload-apk.mjs <apk>`.
