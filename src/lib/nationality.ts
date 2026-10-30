// Nacionalidade da Jolpica (inglês) → rótulo pt-BR e bandeira. Desconhecidas aparecem como vieram.
const N: Record<string, [string, string]> = {
  British: ['Reino Unido', '🇬🇧'], Italian: ['Itália', '🇮🇹'], American: ['EUA', '🇺🇸'], French: ['França', '🇫🇷'], German: ['Alemanha', '🇩🇪'],
  Brazilian: ['Brasil', '🇧🇷'], Belgian: ['Bélgica', '🇧🇪'], Swiss: ['Suíça', '🇨🇭'], Argentine: ['Argentina', '🇦🇷'], Argentinian: ['Argentina', '🇦🇷'],
  'South African': ['África do Sul', '🇿🇦'], Dutch: ['Holanda', '🇳🇱'], Australian: ['Austrália', '🇦🇺'], Austrian: ['Áustria', '🇦🇹'], Spanish: ['Espanha', '🇪🇸'],
  Swedish: ['Suécia', '🇸🇪'], Canadian: ['Canadá', '🇨🇦'], Japanese: ['Japão', '🇯🇵'], Finnish: ['Finlândia', '🇫🇮'], Mexican: ['México', '🇲🇽'],
  'New Zealander': ['Nova Zelândia', '🇳🇿'], Danish: ['Dinamarca', '🇩🇰'], Monegasque: ['Mônaco', '🇲🇨'], Irish: ['Irlanda', '🇮🇪'], Portuguese: ['Portugal', '🇵🇹'],
  Colombian: ['Colômbia', '🇨🇴'], Venezuelan: ['Venezuela', '🇻🇪'], Russian: ['Rússia', '🇷🇺'], Polish: ['Polônia', '🇵🇱'], Hungarian: ['Hungria', '🇭🇺'],
  Thai: ['Tailândia', '🇹🇭'], Chinese: ['China', '🇨🇳'], Indian: ['Índia', '🇮🇳'], Indonesian: ['Indonésia', '🇮🇩'], Malaysian: ['Malásia', '🇲🇾'],
  Czech: ['Tchéquia', '🇨🇿'], Chilean: ['Chile', '🇨🇱'], Uruguayan: ['Uruguai', '🇺🇾'], 'East German': ['Alemanha Oriental', '🇩🇪'], Rhodesian: ['Rodésia', '🏳️'],
  Liechtensteiner: ['Liechtenstein', '🇱🇮'], 'Argentine-Italian': ['Argentina/Itália', '🇦🇷'], 'American-Italian': ['EUA/Itália', '🇺🇸'], Estonian: ['Estônia', '🇪🇪'],
};
export const nationalityLabel = (n?: string | null) => (n ? (N[n] ? `${N[n][1]} ${N[n][0]}` : n) : null);
/** Idade completa em anos numa data (datas civis, sem fuso). */
export const ageAt = (birth: string, at: string) => {
  const b = new Date(`${birth}T00:00:00Z`), d = new Date(at);
  let y = d.getUTCFullYear() - b.getUTCFullYear();
  if (d.getUTCMonth() < b.getUTCMonth() || (d.getUTCMonth() === b.getUTCMonth() && d.getUTCDate() < b.getUTCDate())) y--;
  return y;
};
export const ageFromDays = (days: number) => { const y = Math.floor(days / 365.25); return { y, d: Math.round(days - y * 365.25) }; };
