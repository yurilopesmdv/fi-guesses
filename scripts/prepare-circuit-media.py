#!/usr/bin/env python3
"""Baixa somente mídias curadas, otimiza variantes e gera metadados para importação.
Requer requests e Pillow. Uso: python3 scripts/prepare-circuit-media.py
Não grava no Supabase. Fontes, créditos e aprovação ficam em data/circuits/media-sources.json.
"""
import hashlib, io, json, time
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import requests
from PIL import Image, ImageOps

cache = Path('/tmp/bolao-f1-circuit-media')
cache.mkdir(parents=True, exist_ok=True)
source = Path('data/circuits/media-sources.json')
rows = json.loads(source.read_text())
if any(row.get('delivery') == 'official-origin' for row in rows):
    raise SystemExit('O catálogo usa URLs diretas da fonte oficial. Use data/circuits/official-maps.json; não copie para o Storage.')
def prepare(row):
    if not row.get('approved'):
        raise ValueError('Mídia sem aprovação: ' + row['id'])
    if not all(row.get(k) for k in ['author', 'license', 'license_url', 'source_url', 'download_url', 'caption']):
        raise ValueError('Créditos incompletos: ' + row['id'])
    raw = cache / (row['id'] + '-' + hashlib.sha256(row['download_url'].encode()).hexdigest()[:12] + '.source')
    if not raw.exists():
        for attempt in range(4):
            response = requests.get(row['download_url'], timeout=60, headers={'User-Agent': 'BolaoF1Catalog/1.0'})
            if response.status_code == 429:
                delay = max(30, int(response.headers.get('retry-after', 60)))
                print(f"{row['id']}: fonte limitou downloads; retomando em {delay}s", flush=True)
                time.sleep(delay)
                continue
            response.raise_for_status()
            if len(response.content) > 30 * 1024 * 1024:
                raise ValueError('Arquivo excede limite: ' + row['id'])
            raw.write_bytes(response.content)
            time.sleep(3)
            break
        if not raw.exists():
            raise ValueError('Fonte indisponível: ' + row['id'])
    image = ImageOps.exif_transpose(Image.open(raw))
    if 'A' in image.getbands():
        background = Image.new('RGBA', image.size, 'white')
        background.alpha_composite(image.convert('RGBA'))
        image = background
    image = image.convert('RGB')
    if row.get('crop'):
        left, top, right, bottom = row['crop']
        if not (0 <= left < right <= 1 and 0 <= top < bottom <= 1):
            raise ValueError('Recorte inválido: ' + row['id'])
        image = image.crop((round(left * image.width), round(top * image.height), round(right * image.width), round(bottom * image.height)))
    # Preserva toda a composição; nenhum corte automático no mapa/galeria.
    image.thumbnail((2560, 2560) if row['kind'] == 'map' else (1920, 1920))
    encoded = io.BytesIO()
    image.save(encoded, 'WEBP', quality=94 if row['kind'] == 'map' else 84, method=6)
    checksum = hashlib.sha256(encoded.getvalue()).hexdigest()[:20]
    path = f"v1/{row['circuit_id']}/{row['id']}-{checksum}"
    out = cache / (path + '.webp')
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_bytes(encoded.getvalue())
    thumb = image.copy()
    thumb.thumbnail((640, 640))
    thumbnail = cache / (path + '-thumb.webp')
    thumb.save(thumbnail, 'WEBP', quality=90 if row['kind'] == 'map' else 80, method=6)
    result = dict({k: row.get(k) for k in ['id', 'circuit_id', 'kind', 'sort_order', 'caption', 'author', 'license', 'license_url', 'source_url', 'period', 'layout_season']}, **{
        'storage_path': path + '.webp', 'thumbnail_path': path + '-thumb.webp',
        'width': image.width, 'height': image.height, 'published': True,
    })
    print(f"{row['id']}: {image.width}×{image.height}, {out.stat().st_size // 1024} KB", flush=True)
    return result

# Três arquivos por vez; o backoff permanece por requisição e o cache evita novo download.
with ThreadPoolExecutor(max_workers=3) as pool:
    prepared = list(pool.map(prepare, rows))
Path('data/circuits/prepared-media.json').write_text(json.dumps(prepared, ensure_ascii=False, indent=2) + '\n')
