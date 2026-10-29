import { XMLParser, XMLValidator } from 'fast-xml-parser';

export const NEWS_SOURCES = {
  'motorsport-br': { url: 'https://motorsport.uol.com.br/rss/f1/news/', hosts: ['motorsport.uol.com.br'], path: '/f1/' },
  'grande-premio': { url: 'https://grandepremio.com/br/f1/feed/', hosts: ['grandepremio.com', 'www.grandepremio.com.br', 'grandepremio.com.br'], path: '/br/f1/' },
} as const;
export type NewsSource = keyof typeof NEWS_SOURCES;
export type FeedPost = { title: string; summary: string; url: string; author: string | null; published_at: string };
export function plainText(value: unknown) {
  if (typeof value !== 'string') return '';
  return value.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]*>/g, ' ')
    .replace(/&#(x[0-9a-f]+|\d+);/gi, (_, n: string) => { const point = n[0].toLowerCase() === 'x' ? parseInt(n.slice(1), 16) : Number(n); return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : ''; })
    .replace(/&(amp|quot|apos|lt|gt|nbsp);/g, (_, n: string) => ({amp:'&',quot:'"',apos:"'",lt:'<',gt:'>',nbsp:' '}[n]!))
    .replace(/\s+/g, ' ').trim();
}
export function canonicalNewsUrl(value: unknown, source: NewsSource) {
  if (typeof value !== 'string') return null;
  try {
    const u = new URL(value), config = NEWS_SOURCES[source];
    if (u.protocol !== 'https:' || u.username || u.password || !(config.hosts as readonly string[]).includes(u.hostname)) return null;
    if (!u.pathname.startsWith(config.path) && !(source === 'grande-premio' && u.hostname.endsWith('grandepremio.com.br') && u.pathname.startsWith('/f1/'))) return null;
    u.hash = ''; for (const key of [...u.searchParams.keys()]) if (/^utm_|^fbclid$|^gclid$/i.test(key)) u.searchParams.delete(key);
    return u.href;
  } catch { return null; }
}
export function parseNewsFeed(xml: string, source: NewsSource, now = Date.now()): { posts: FeedPost[]; ttl: number } {
  if (xml.length > 2_000_000 || /<!DOCTYPE|<!ENTITY/i.test(xml)) throw Error('Feed XML inválido ou acima do limite.');
  if (XMLValidator.validate(xml) !== true) throw Error('Feed XML malformado.');
  const doc = new XMLParser({ignoreAttributes:true,parseTagValue:false,trimValues:true,processEntities:true}).parse(xml);
  const channel = doc?.rss?.channel;
  if (!channel || !channel.item) throw Error('Feed RSS sem itens.');
  const items = Array.isArray(channel.item) ? channel.item : [channel.item];
  const posts = new Map<string, FeedPost>();
  for (const item of items.slice(0, 200)) {
    const title = plainText(item.title).slice(0, 300), url = canonicalNewsUrl(item.link, source), time = Date.parse(item.pubDate);
    if (!title || !url || !Number.isFinite(time) || time > now || time < now - 45 * 86400000) continue;
    // Só a descrição fornecida no RSS: nunca content:encoded ou corpo da matéria.
    const description = String(item.description ?? '').split(/Leia também:|<a\b[^>]*class=['"]more['"]/i)[0];
    let summary = plainText(description);
    if (summary.length > 320) summary = summary.slice(0, 317).replace(/\s+\S*$/, '') + '…';
    posts.set(url, {title,summary,url,author:plainText(item['dc:creator'] ?? item.author).slice(0, 160) || null,published_at:new Date(time).toISOString()});
  }
  return {posts:[...posts.values()],ttl:Math.ceil(Math.min(180,Math.max(10,Number(channel.ttl) || 10)))};
}
export async function readFeedResponse(response: Response): Promise<string> {
  if (!response.body) throw Error('Resposta de feed vazia.');
  const reader = response.body.getReader(), parts: Uint8Array[] = []; let total = 0;
  try { for (;;) { const {done,value} = await reader.read(); if(done)break; total += value.length; if(total>2_000_000)throw Error('Feed acima do limite.'); parts.push(value); } }
  catch(e) { await reader.cancel(); throw e; }
  const bytes=new Uint8Array(total);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.length;}return new TextDecoder().decode(bytes);
}
