/** Habilitar apenas depois de configurar e validar a assinatura OpenF1.
 * A variável é pública e incorporada no build/OTA; não é uma credencial.
 */
export const LIVE_ENABLED = process.env.EXPO_PUBLIC_LIVE_ENABLED === 'true';
