import { Share } from 'react-native';

const SITE = 'https://bolao-f1.expo.app/entrar.html';

export const inviteLink = (code: string) => `${SITE}?c=${code}`;

export const shareInvite = (poolName: string, code: string) =>
  Share.share({
    message: `🏎️ Bora pro bolão "${poolName}" no Bolão F1!\n\nCódigo: ${code}\nEntrar: ${inviteLink(code)}`,
  });
