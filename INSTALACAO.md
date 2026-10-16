# Bolão F1 — instalação e uso

Destinos verificados em 16/10/2026: web, página de convite e arquivo APK responderam HTTP 200. Instalação nos aparelhos e compatibilidade do Expo Go não foram exercitadas nesse levantamento. Operação e publicação detalhadas: [docs/INFRA_OPERACAO.md](docs/INFRA_OPERACAO.md).

## Android (3 aparelhos)
1. Abra no celular: https://tqbftaqkqtjouovyvrkq.supabase.co/storage/v1/object/public/site/bolao-f1.apk
   (ou aponte a câmera pro `docs/qr-apk.png`)
2. Baixar → ao abrir, o Android pede pra permitir instalar de "fonte desconhecida" → **Permitir** → **Instalar**.
3. Abrir o **Bolão F1** → **Criar conta** (nome, e-mail, senha).

Atualizações de JavaScript compatíveis são verificadas ao abrir o app. Mudanças nativas exigem instalar um novo APK. O APK é apenas arm64; não atende aparelhos de outras arquiteturas.

## iPhone (2 aparelhos)
1. App Store → **Expo Go**.
2. Câmera → apontar pro `docs/qr-expo-go.png` → "Abrir no Expo Go".
   Ou Expo Go → *Enter URL manually* →
   `exp://u.expo.dev/7efe543a-c812-4af7-9e7b-bc998f3b2f4c?channel-name=preview&runtime-version=exposdk:57.0.0`
3. Se pedir login no Expo Go: conta `yurilopesmdv`.
4. **Criar conta** no app.

O link aponta ao canal `preview`, com runtime do SDK 57. A abertura depende de um Expo Go compatível com esse runtime; se falhar, use o navegador e confira a compatibilidade antes de regenerar os links.

## Qualquer aparelho, sem instalar
https://bolao-f1.expo.app (no iPhone: Compartilhar → "Adicionar à Tela de Início").

## Convidar
Use o convite na home ou na aba de participantes. O compartilhamento usa o menu do aparelho, que permite escolher WhatsApp. O link abre uma página com: baixar APK (Android) / abrir no Expo Go (iPhone) / abrir no navegador. A rota de convite pede login/cadastro se necessário e depois entra no bolão. Ao instalar o APK pela primeira vez, pode ser necessário reabrir o convite ou digitar o código. Todos os bolões também aparecem na home em "Bolões da galera" com botão Participar.

## Tempo real (aba Ao vivo)
A aba mostra um aviso de assinatura enquanto o monitor está desabilitado, sem iniciar consultas OpenF1. A ativação depende de assinatura validada e novo bundle com `EXPO_PUBLIC_LIVE_ENABLED=true`; não há chave de ativação na interface. No modo habilitado, fora de sessão o monitor consulta a sessão mais recente. Preço e disponibilidade da assinatura não foram confirmados. A implementação lê credenciais opcionais de `app_settings`, acessível aos usuários autenticados; não envie senhas pelo chat. Consulte [tarefas e configuração](docs/TASKS.md) e as pendências em [docs/DIAGNOSTICO.md](docs/DIAGNOSTICO.md).

## Publicar nova versão (eu faço)
```bash
npx eas-cli update --channel preview --environment preview --platform all --message "..."
```
Novo APK (só se mudar algo nativo): `eas build -p android --profile preview` → `node scripts/upload-apk.mjs <apk>`.
