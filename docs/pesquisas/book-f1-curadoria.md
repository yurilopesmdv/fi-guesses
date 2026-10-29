# Curadoria do book F1 — 29/10/2026

Regra confirmada pelo usuário: fotos da pista e dos trechos, apenas no traçado usado pela F1. Quando aparecem carros, devem ser exclusivamente F1. O asfalto e o desenho do trecho são o assunto principal; turismo, público, pódios, retratos e vistas muito distantes ficam fora. Fonte oficial não basta para aprovar: os sites dos circuitos misturam categorias.

O manifesto publicável é `data/circuits/track-book.json`. Cada foto registra dimensões reais, fonte, crédito, legenda do trecho, período sem inventar ano de captura e revisão individual. O importador exige esses campos. Não há busca automática de imagens pelo telefone nem preenchimento por quantidade. As fotos são carregadas da origem; não são apresentadas como licença livre.

| Pista | Fotos aprovadas | Origem |
|---|---:|---|
| Interlagos | 6: S do Senna, Curva do Sol, Reta Oposta, Curva do Lago, Mergulho e Junção | Prefeitura de São Paulo/SPTuris, guia oficial de trechos do autódromo |
| Zandvoort | 3: duas vistas da Curva 9 e Arie Luyendykbocht | Guia de curvas do Circuit Zandvoort |
| Albert Park | 2: sequência 3–4 e aproximação do setor rápido | Programa oficial do Australian Grand Prix |
| Red Bull Ring | 1: Graz/T7 | Guia oficial do circuito |
| Spa | 2: Eau Rouge/Raidillon | Guia oficial de curvas e Formula1.com |
| Austin | 1: asfalto, zebras e área de escape | Guia oficial Formula1.com |

Exclusões relevantes para futuras revisões:

- Zandvoort: o mesmo guia contém Porsche, GT e carros de turismo. Essas fotos foram rejeitadas.
- Red Bull Ring: a chicane específica de MotoGP não representa o traçado F1, mesmo fotografada vazia.
- Madring: vista de circuito com automóvel de rua, obras vistas de longe e evento do eclipse foram descartados. Jarama histórico não pode ilustrar o circuito atual de Madrid.
- Monza: não usar galerias de GT nem carros históricos de categoria incerta. Fotos de largada com os carros como assunto não substituem um book do traçado.
- Suzuka: kartódromo, percurso de motos e fotos de arquibancada/facilidades não representam as curvas do traçado F1.
- PDFs FIA: o cabeçalho do GP não garante que todas as fotos sejam daquele circuito. Há exemplos genéricos de outras pistas e imagens pequenas de pit lane; não foram usadas.
- Capas oficiais dos GPs: muitas são de pilotos, pódios, público ou turismo. Não foram aprovadas em bloco.
- As 90 fotos da seleção anterior continuam despublicadas; não reutilizar o manifesto antigo.

A seleção de 15 fotos cobre seis dos 23 circuitos atuais. Nos demais, o mapa oficial e todos os indicadores permanecem, sem um book vazio nem imagens inadequadas. A pesquisa cobriu fontes oficiais dos circuitos, guias Formula1.com e notas FIA; a cobertura fotográfica completa continua pendente de material que satisfaça este padrão. As 55 pistas históricas foram publicadas sem fotografias ou diagramas comunitários.

Verificação: 15 URLs com HTTP 200 pelo cliente Node; revisão visual individual e testes móveis do book. Interlagos recusou o cliente Python, mas as fotos carregaram no navegador e na validação da web publicada. Não foi usado procedimento para contornar o bloqueio.
