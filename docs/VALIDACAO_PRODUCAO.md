# Validação e publicação — 16/10/2026

Este relatório complementa o diagnóstico inicial, que preserva o estado anterior às correções. Nenhum segredo é registrado aqui.

## Backend confirmado

- Supabase `tqbftaqkqtjouovyvrkq`, região `sa-east-1`; credencial administrativa substituída pelo usuário e validada. Token Expo restaurado e validado.
- Migrations até `0019` aplicadas e registradas em `public._migrations`.
- `sync-series` versão 8 ACTIVE, `verify_jwt: true`; OPTIONS/CORS, validação de corpo/método e propagação de falhas implementados.
- Cron preservado, com timeout de POST aumentado de 5 s para 120 s (`0018`). Respostas reais 625/626: HTTP 200, sem timeout, corpo indicando sucesso.
- Sincronização manual F1/F2/F3 concluída. Amostra 2026: F1 23 corridas/374 resultados; F2 14/36; F3 9/27. Esses números representam o momento da validação, não cobertura completa ou resultado futuro garantido.

## Integração real

Com contas e bolões temporários, foram exercitados login, trigger de perfil, criação de bolão, convite, palpites, apuração, ranking geral (9 e 3 pontos), exclusão pelo proprietário e cascata. Membro não pôde excluir/apurar e anônimo não pôde consultar ranking. Perfis e dados esportivos foram preservados. RPCs de piloto/equipe e classificação das três categorias responderam.

No Chromium em 390×844, contra a web publicada: Ao vivo desligado sem chamadas OpenF1; botão Atualizar sincronizou F1 por POST com CORS; ranking real, identificação da apuração e confirmação/cancelamento/exclusão funcionaram. Um segundo teste excluiu pela interface um bolão de GP passado. O usuário confirmou exclusão no iPhone/Expo Go.

Para o status novo, foram criados quatro bolões temporários com datas de criação controladas: dois em andamento e dois finalizados. A RPC real e o navegador comprovaram prioridade dos em andamento, recência dentro dos grupos, aviso de pergunta pendente e status interno. Ao apurar a pergunta restante, a atualização periódica moveu o cartão para Finalizados e preservou a ordem por criação. Contas e bolões de teste foram removidos; a lista de IDs dos bolões preexistentes foi comparada antes/depois e permaneceu intacta.

## Validação local

24 testes aprovados: 16 SQL/RLS em PGlite, 6 do handler HTTP e 2 de status/ordenação. TypeScript e exportação web em Node 20.19.5 aprovados. PGlite não executa cron/net; cron foi verificado separadamente no serviço. A primeira tentativa de assert interno no navegador encontrou texto na tela anterior oculta; o seletor foi corrigido para elementos visíveis e o fluxo completo passou.

Scripts de publicação usam `.env` sem imprimir credenciais. EAS carrega variáveis com precedência do processo; convite/link APK compartilham preparação entre CI/manual; função é empacotada com esbuild e publicada via Management API. O erro sintático de sync-all foi corrigido; backfill integral não foi executado.

## Distribuição

Primeira entrega de exclusão/ranking/Ao vivo/apuração: OTA `fb76ae24-bd34-4218-bd39-baec53639fc5`, canal `preview`, runtime `exposdk:57.0.0`; web deployment `5hydhadnts`. Entrega de status/ordenação confirmada: OTA `b7e7ec59-4225-4af4-890e-31ba71324044`, canal/branch `preview`, runtime `exposdk:57.0.0`, iOS `01a14589-4e5e-7ae9-8201-193959adcca1` e Android `01a14589-4e5e-7c2e-be3e-663da93bd4e8`. Web deployment `eqfb8u2efb` promovido para produção. Manifestos públicos do EAS consultados para iOS/Android: HTTP 200 e IDs iguais aos desta publicação. O teste completo de status/ordenação e transição automática foi repetido contra o domínio de produção e passou, com limpeza e preservação dos bolões preexistentes.

Site de produção: [bolao-f1.expo.app](https://bolao-f1.expo.app). Alterações são JavaScript; nenhum APK novo foi gerado. No Expo Go, fechar e reabrir o projeto para carregar a versão publicada; se estiver conectado ao Metro local, recarregar esse projeto usa o código local.

## Limites e pendências

Não houve teste em aparelho físico, build nativo, restauração, carga, auditoria de dependências ou sessão ao vivo paga. As policies amplas de dados esportivos e o acesso autenticado a `app_settings` permanecem pendências estruturais: não houve alteração de permissões fora das tarefas. Não foi auditado o conjunto de secrets/proteções do GitHub. O fluxo normal de entrega é commit e push na `main`, que dispara CI e publicação de backend, OTA e web. A publicação manual descrita neste relatório antecedeu o versionamento destas alterações.


## Upgrade para Expo SDK 58 — 24/10/2026

Projeto migrado para Expo `58.0.19`, React Native `0.88.0` e React `19.3.0`, com dependências recomendadas por `expo install`. Node local em `22.23.2` (`.nvmrc`) e CI em Node 22, conforme o mínimo do SDK 58. Referências de `ScrollView` e `TextInput` adaptadas para os tipos de instância da API estrita do React Native. Convite, instruções de instalação e QR code agora usam `exposdk:58.0.0`. O usuário informou que ambos os iPhones já usam Expo Go compatível com SDK 58; o histórico do Expo Go pode manter o link antigo, então abrir pelo novo link/QR code.

TypeScript, 24 testes, `expo install --check` e exportação de iOS/Android/web aprovados em Node 22.23.2. `expo-doctor`: 19/20 verificações aprovadas; o único aviso é `eas-cli` como dependência local, configuração preexistente usada por `scripts/eas.mjs`. Mantido esse mecanismo de publicação. Sem teste em aparelho físico ou geração de novo binário nativo.

Publicação manual no canal/branch `preview`, runtime `exposdk:58.0.0`, grupo OTA `df00ab36-017d-40fa-baea-20219044588a`: iOS `01a16fa1-fbd6-7f3d-a343-73757966630b`, Android `01a16fa1-fbd6-75d4-b1b2-0fc9c3b7d877`. Manifestos públicos: HTTP 200, runtime e IDs conferidos. Bundles baixados por GET com os headers de `extensions.assetRequestHeaders` do manifesto: HTTP 200 (iOS 3.939.155 bytes; Android 4.268.705 bytes). O CDN exige esses headers; acessá-lo diretamente sem eles retorna 403.

Web deployment `slq8s1tmk5` promovido para [bolao-f1.expo.app](https://bolao-f1.expo.app), com página de convite atualizada. Publicação com Ao vivo desligado (`EXPO_PUBLIC_LIVE_ENABLED=false`). Sem alterações no backend ou substituição do APK existente; o manifesto Android SDK 57 continua disponível em HTTP 200, ID `01a14596-6373-7c2a-9cb7-6b502938121e`. Para o APK receber futuras alterações do SDK 58, será necessário novo build Android.


## Correção do calendário no detalhe do bolão — 24/10/2026

O detalhe dependia do calendário global carregado após o login e encerrava seu próprio carregamento antes de receber as corridas. Falhas nesse carregamento global eram silenciadas e mantinham uma lista vazia. Isso permitia exibir “Nenhuma corrida cadastrada” mesmo com calendário no banco. O `PoolProvider` agora consulta corridas e pilotos F1 de `pool.season` diretamente por `repo.ts`, mantém carregamento até a resposta e apresenta erro com “Tentar novamente” se a consulta falhar. O botão também permite recarregar um calendário realmente vazio. Preservado o filtro de GP único.

TypeScript e 26 testes aprovados. Dois testes novos exercitam o provider real com respostas controladas: calendário lento/ano do bolão/F1/GP único e recuperação após falha de rede. Exportações SDK 58 (Android/iOS/web) e SDK 57 (Android) aprovadas; TypeScript também aprovado na cópia isolada SDK 57. Sem alterações de banco nem novo APK. A cópia isolada não recebe arquivo `.env`; as variáveis são fornecidas em memória ao processo de compilação/publicação.

Android SDK 57 publicado no canal/branch `preview`: grupo `4b782f62-2c67-4dd6-8675-d2391a49d802`, update `01a16fe7-ce69-706e-a3af-defc5ce14c0f`. O APK instalado recebe a correção por OTA ao fechar e abrir conectado à internet. Abertura em aparelho físico depende de confirmação do usuário.


A mesma correção foi publicada para SDK 58 no canal/branch `preview`: grupo `b2e02ab8-f440-4233-b885-c93f62681e63`, Android `01a16fe8-5ed7-78a7-bdcc-b5d00cb97667` e iOS `01a16fe8-5ed7-79f6-80de-a96e9e9b2255`. Os três manifestos (Android 57/58 e iOS 58) responderam HTTP 200 com os IDs esperados; os três bundles foram baixados com HTTP 200 usando os headers do manifesto. Novas aberturas do Expo Go usam o mesmo QR code SDK 58 já distribuído. Todas as publicações mantêm Ao vivo desligado.


Web deployment `dffj5ksig2` promovido para produção em `https://bolao-f1.expo.app`.


Rastreabilidade Git: a migração está no commit `03f6656` da `main`. O hotfix do APK SDK 57 está no commit `8b9f883`, branch `compat/android-sdk57`, preservando suas dependências nativas; a correção e seus testes também estão na `main` para SDK 58. Publicações futuras devem partir de commits enviados ao GitHub.

## Grid de largada — 26/10/2026

Implementação no commit `cadb8d2` da main; CI e Deploy concluídos com sucesso na execução `40310508096`. TypeScript, 32 testes e exportação web aprovados. Grid completo compartilhado por bolão e detalhe da corrida, inclusive histórico, com resultados importados como prioridade; depois OpenF1 e classificação Jolpica identificada como provisória. Resultado do bolão passa a mostrar todos os pilotos. Não houve nova migration nem alteração de pontuação.

SDK 58 publicado automaticamente no canal/branch preview: grupo `b9a4d160-babc-400c-8eaa-1d3cb1f06b3e`, Android `01a177d7-6e68-7d8b-b12f-b580f3a9846c`, iOS `01a177d7-6e68-728d-b95a-48e0301705fe`. Web deployment `abiuy7k43q` promovido para produção em https://bolao-f1.expo.app.

APK Android SDK 57: port rastreável no commit `89f1a93`, branch `compat/android-sdk57`, enviado ao GitHub antes da publicação. TypeScript, seis testes novos de grid e exportação Android aprovados. Grupo OTA `60a1482e-9af3-40b0-92c0-cfb443480cbb`, update `01a177d7-8c64-71c6-b407-ec95104234e3` no canal preview. Nenhum novo APK necessário.

Os três manifestos e respectivos bundles responderam HTTP 200 usando headers públicos do manifesto; site de produção HTTP 200. Jolpica retornou 20 classificados de 1996/rodada 1. Consultas públicas OpenF1 de sessão, grid e pilotos responderam HTTP 200 em amostra; outra sessão histórica retornou 404 e a alternativa Jolpica permaneceu disponível. Fontes não garantem cobertura de todo GP. Ao vivo continua desligado; grid é consulta esportiva independente. Não houve validação em aparelho físico nem teste visual autenticado nesta entrega.

## Separação de largada, qualy e chegada — 26/10/2026

Correção da entrega anterior no commit `bb168f5`: o grid publicado OpenF1 está vinculado à sessão Qualifying do mesmo GP, e não à Race. A consulta anterior recebia 404 e recorria à ordem da qualy. Agora `getStartingGrid` retorna exclusivamente posições de largada; `getQualifyingOrder` tem consulta/cache próprios e seção distinta enquanto não há grid. Resultado final tem componente próprio, sem substituição por outra sessão. No bolão aberto, grid com expansão e seletor ordenado por largada; “Larga em P…” aparece na escolha do piloto e no pódio selecionado. Na chegada, cada piloto também informa “Largou em P…”.

TypeScript, 33 testes e exportação web aprovados. Navegador 390×844 no build local e no domínio publicado: grid independente, seletor/pódio com posição de largada, salvamento simulado, expansão completa, qualy separada sem grid e chegada distinta da largada. Todas as chamadas e escritas do teste visual foram interceptadas, sem alteração no banco compartilhado; nenhum erro JavaScript. A primeira tentativa contra o domínio durante a promoção ainda carregou a interface anterior e expirou; repetição após conclusão do deploy passou. Integração pública real: Canadá 2024 retornou 20 pilotos; Canadá 2023 retornou Hülkenberg P5 no grid e P2 na qualy (rodada 8), confirmando que punições não são substituídas pela classificação.

CI `40312086653` e Deploy `40312086787` concluídos com sucesso. SDK 58 preview: grupo `c7ed5d2d-76d0-41ad-aab1-804de0c7d937`, Android `01a177e2-f13e-79d3-9467-a70ba06587c2`, iOS `01a177e2-f13e-7e80-95c0-3a9088788902`. Web deployment `pehw8pb23o` promovido para https://bolao-f1.expo.app.

Port SDK 57: commit `de702ac`, branch `compat/android-sdk57`, enviado antes da publicação. TypeScript, sete testes de grid e exportação Android aprovados. Grupo OTA `eccb5b06-e9e9-466d-9cb0-6be25771a1f2`, update Android `01a177e2-2c9a-7ad5-83bf-745ca90a627f`. Os três manifestos e bundles responderam HTTP 200 com headers do manifesto. Sem migration ou novo binário. Monitor Ao vivo permanece desligado; testes em aparelho físico continuam pendentes.

## Pistas atuais — 28/10/2026

Código `9458c5f` e correção de grants `b3359ed`, enviados à main antes da publicação. Migrations 0020/0021 aplicadas e registradas. Catálogo publicado com 23 pistas, 90 fotos, 23 mapas, 226 variantes WebP e 708 registros históricos de vencedores. As imagens foram conferidas em pranchas; versões antigas de mapas de Suzuka/Spa/Yas Marina foram substituídas e as marcações de DRS de 2022 são identificadas. Madring tem duas fotos verificadas; as demais pistas têm quatro.

40 testes, TypeScript, exportação web e Android SDK 57 aprovados. Navegador com dados isolados em 390×844 e 360×800: busca por país, perfis, estatísticas, mapa/zoom/créditos e galeria. No Supabase real: catálogo/perfis, imagens públicas por HEAD (226/226), anônimo bloqueado (401), escrita de membro e RPC administrativa bloqueadas (403), alteração sem efeito sob RLS e upload de WebP válido bloqueado por row-level security. O teste reproduz agora os grants padrão de funções do Supabase. Contas temporárias removidas.

Workflow Deploy `40785743754` concluído com sucesso: backend e Edge Function, OTA SDK 58 e hospedagem. Grupo SDK 58 `dbb5a5d9-68a6-4fe1-ba9a-77596dd0c2da`: Android `01a184cb-b4f4-7f48-9946-c55e7e7bbf1b`, iOS `01a184cb-b4f4-768f-95e1-7cb636aa658f`. Web deployment `r9bzljlt0p`, promovido para https://bolao-f1.expo.app.

Compatibilidade APK: commit `90db1a7`, branch `compat/android-sdk57`, enviado antes do OTA Android. Grupo `fa62d413-f5b9-4d57-b405-f7ba5ab5b0df`, update `01a184ca-6c46-745d-b731-db306a634c12`. Os três manifestos e bundles retornaram HTTP 200 com os novos IDs. Nenhum módulo nativo novo/APK novo. Atualização pelo canal preview existente ao fechar e reabrir; Expo Go conserva o projeto já escaneado.

No domínio publicado, com usuário temporário: lista real de 23 pistas, busca Brasil, perfil de Interlagos, avanço da galeria, mapa com zoom e créditos, sem erros JavaScript. Sem teste em aparelho físico; gestos nativos validados por compilação, não por hardware. Históricas e Notícias permanecem como próximas etapas.

## Correção visual de Pistas — 29/10/2026

Por solicitação do usuário, todas as fotografias e galerias foram removidas das telas, incluindo capas dos cartões. Somente o traçado oficial da Fórmula 1 identifica cada pista, sobre fundo escuro, com ampliação/zoom. Dados, indicadores, maiores vencedores e ficha do GP foram preservados. Históricas e Notícias foram interrompidas e o trabalho não publicado foi preservado em stash.

Código `6d9997d`, enviado à main antes da publicação. Migration 0022 aplicada e registrada: fotografias e mapas anteriores despublicados; 23 mapas oficiais publicados e nenhuma fotografia publicada. Metadados e importador agora exigem exatamente um mapa do domínio media.formula1.com por pista. GET dos 23 arquivos oficiais aprovado, dimensões de 1920×1080 a 3840×2160. URLs diretas da origem, sem cópia para o Storage nem atribuição de licença aberta.

TypeScript, 40 testes e exportação web aprovados; TypeScript SDK 57 e compilação Android pelo OTA aprovados. Navegação isolada em 390×844/360×800: ausência de galeria, mapa oficial em fundo escuro, zoom, fontes e estatísticas. CI `40815774130` e Deploy `40815774059` concluídos com sucesso.

SDK 58, grupo `fa475880-3514-4b81-be31-48ff4d3556ee`: Android `01a185d7-ffd9-79dc-a088-a90171f65529`, iOS `01a185d7-ffd9-7cc4-913d-4d64bb003ed2`. APK SDK 57: commit `5db47b7` enviado na branch compat/android-sdk57 antes do OTA, grupo `8c9066b2-9f0f-4d19-8b6f-e2664ff89d44`, update Android `01a185d6-7f26-7be8-944a-ca2da7d574a2`. Os três manifestos e bundles responderam HTTP 200 com os novos IDs.

Web deployment `c8crzbwx7w`. O domínio principal ainda serviu o deployment anterior após o sucesso do workflow; `eas deploy:alias --prod --id c8crzbwx7w --non-interactive` promoveu explicitamente a versão correta. Depois disso, HTML e hashes do domínio principal corresponderam ao novo deployment.

Teste real em https://bolao-f1.expo.app com conta temporária: catálogo de 23 mapas oficiais sem capa fotográfica, busca Brasil, perfil de Interlagos sem galeria, carregamento real do mapa diretamente de media.formula1.com, zoom e fonte, sem erros JavaScript. Teste também passou no domínio imutável do deployment. As contas temporárias foram removidas. As primeiras tentativas detectaram cache anterior e uma imagem ainda carregando após 700 ms; o alias foi corrigido e a verificação repetida com carregamento concluído. Nenhum teste em aparelho físico ou novo binário; atualização pelos projetos/canal já distribuídos, sem novo QR code.


## Book de trechos exclusivos da F1 — 29/10/2026

Código `e224d09` na main, compatibilidade APK SDK 57 `1d5e4be`. Migration 0023 aplicada antes do cliente; manifesto com 15 fotos aprovadas em seis circuitos (Interlagos 6, Zandvoort 3, Albert Park 2, Spa 2, Red Bull Ring 1, Austin 1). Fontes oficiais dos circuitos/promotores e Formula1.com; carros visíveis exclusivamente F1. Fotos antigas permanecem despublicadas. A lista mantém identidade pelos 23 mapas oficiais. Esta seleção não representa book completo das 23 pistas.

TypeScript, 40 testes, exportações web e Android SDK 57 passaram. Navegação em Chromium 390×844/360×800: busca, detalhe, Sobre, indicadores, expansão do book, foto 1→2, mapa/zoom/créditos. As 15 origens responderam HTTP 200 pelo cliente Node; o cliente Python recebeu 403 em Interlagos, mas a imagem carregou no navegador real e na validação web publicada. Não houve alteração para contornar bloqueio nem cópia das imagens para Storage.

Integração Supabase real: 23 mapas, 15 fotos exatamente iguais ao manifesto, 23 perfis completos, Albert Park com 14 curvas. Anônimo negado (401), inserção de mídia por membro negada (403), atualização por membro sem efeito. Conta temporária removida.

Deploy GitHub [40863674418](https://github.com/yurilopesmdv/fi-guesses/actions/runs/40863674418) concluído. EAS SDK 58 grupo `982e9836-0c5a-4c47-b4d4-18b6c1815766`, Android `01a1875f-343f-76df-8d03-32c83e168f34`, iOS `01a1875f-343f-7f72-9fb5-08e2a7fdd384`. APK SDK 57 grupo `a44ee40d-eb35-4808-a876-a73259d16068`, Android `01a1875d-c8ab-7835-a122-b996fe5cd4ff`. Manifestos e bundles dos três retornaram 200 com os IDs esperados. Web deployment `ldp8kewgxz`; domínio de produção confirmou o book com foto de Curva do Sol carregada, expansão de seis trechos, navegação, mapa oficial e créditos, sem erro JavaScript. Não foi feito teste físico em iPhone/Android.


## Pistas atuais e históricas separadas — 29/10/2026

Código `836da75`, compatibilidade SDK 57 `cf7227b`. Migration 0024 aplicada; importação de 55 sedes, 459 edições e 462 vencedores. Nenhuma mídia histórica foi publicada. Supabase real: 23 atuais e 55 históricas sem sobreposição, 55 perfis conferidos contra os totais versionados, 23 mapas oficiais e 15 fotos do book preservados, leitura anônima negada. Conta temporária removida.

41 testes, TypeScript, exportações web/Android SDK 57 e interface móvel passaram. Fluxo local e publicado: abre em Atuais; alterna para Históricas, busca Caesars Palace, abre perfil de 1981–1982 e retorna às atuais; mapa, book e dados de Interlagos preservados. Sem erros JavaScript.

Deploy [40910934042](https://github.com/yurilopesmdv/fi-guesses/actions/runs/40910934042) concluído. Grupo SDK 58 `9eed3127-2dc7-4fb7-8040-217d88ca4d74`, Android `01a1887a-ec8e-78fb-ae40-d31980530b67`, iOS `01a1887a-ec8e-7197-936e-0cbb670f9101`; grupo SDK 57 `480c2241-c14d-4091-99db-62c2be9ce1a0`, Android `01a18878-f409-7bda-8974-f697d6c1f18c`. Web deployment `6wqvri7uq8`. Manifestos/bundles 200 e domínio de produção confirmado por navegação real em Chromium móvel. Sem teste físico nesta entrega.


## Notícias F1 automáticas — 29/10/2026

Código `bb912df` + correção `4430e68` na main; compatibilidade APK SDK 57 `4be2cb4`. Migrations 0025–0027 aplicadas. A comparação inicial do token de serviço retornou 403 no handler; foi substituída por segredo dedicado `CONTENT_SYNC_SECRET` configurado na Edge Function e Vault, mantendo JWT habilitado no gateway. Nenhuma migration aplicada foi editada. A versão corrigida coletou com HTTP 200 antes da publicação do cliente.

Primeira coleta: 58 notícias (49 Motorsport Brasil, 9 Grande Prêmio) e uma curiosidade diária derivada do acervo; datas reais, sem artigos integrais ou imagens. As duas fontes registraram sucesso e nenhum erro. Motorsport declara TTL 100 minutos, respeitado pelo coletor. Cron `*/10 * * * *` ativo: execução automática de 29/10 às 13h40 de Brasília com status succeeded; fila pg_net confirmou requisições 944/945 com HTTP 200, sem timeout. Lease liberada. Segredos apenas no Vault/Edge, sem valores em app_settings, arquivos ou logs.

Validação real com conta temporária: leitura autenticada dos 59 posts; anônimo 401, escrita de membro 403 e chamada do coletor por membro 403. Conta removida. As 48 verificações passaram (24 SQL/RLS, 6 HTTP esportivo, 2 status, 2 provider, 7 grid, 2 circuitos e 5 RSS/handler). Passaram TypeScript principal, typecheck estrito dos módulos compartilhados de notícias, bundles das duas Edge Functions, exportação web e Android SDK 57. UI móvel local: feeds reais como fixtures, filtros, paginação, curiosidade → pista e nenhuma consulta do monitor OpenF1.

Deploy [40913753504](https://github.com/yurilopesmdv/fi-guesses/actions/runs/40913753504) concluído; banco, sync-series e sync-news publicados antes do cliente. Grupo SDK 58 `2e57630a-049c-4c02-be90-b2a7cfda9582`, Android `01a1888a-2588-7fc4-a300-b7d702ce0f87`, iOS `01a1888a-2588-7d9b-b30b-eb1c137e5526`; grupo APK SDK 57 `4a935b59-1a4e-4bb7-8c8d-f0ba4300e457`, Android `01a18888-a432-72e1-b2c1-5940cd0e6e7a`. Web deployment `z8pjosug0x`. Manifestos e bundles dos três runtimes retornaram 200 com os IDs esperados.

Web de produção conferida em Chromium móvel: rota /live com manchete real e resumos, paginação, filtro Curiosidades, acesso à pista; depois Atuais 23 → Históricas 55 → Caesars Palace → Atuais → Interlagos, book com seis trechos/foto carregada, mapa oficial/zoom/créditos. Nenhum erro JavaScript e nenhuma requisição OpenF1. Conta temporária removida. O grid anterior permanece no bundle. Não houve teste físico em aparelho.

Limite fotográfico explícito: 15 fotos de seis pistas atuais; as demais mantêm mapa oficial, e históricas ficam sem fotografias/diagramas não aprovados. Critérios e exclusões em [Curadoria do book F1](pesquisas/book-f1-curadoria.md).


## Ferramentas opcionais e salvamento persistente — publicação de 29/10, conferência em 30/10/2026

Código `93971a7`, com correções `1c76aca`, `c252e7a` e `a1a3790`, enviado à main antes de publicar. Plano e limites em [Evolução do bolão](PLANO_EVOLUCAO_BOLAO.md). Migrations 0028–0031 aplicadas antes do cliente. Perguntas antigas continuam como Corrida; nenhuma pergunta de qualy/sprint foi criada em bolões existentes. A correção 0031 impede eventos duplicados na auditoria de upsert; não houve edição de migration aplicada.

64 testes aprovados: 48 anteriores, quatro SQL/RLS, seis de fila persistente e seis de análises. TypeScript principal/SDK 57, exportação web, exportação Android SDK 57, sintaxe dos scripts e bundle de sync-news aprovados. Navegador móvel 390×844/360×800 com fixtures: comparação no seletor, fechamento independente por sessão, fila/confirmação, simulador sem escritas, termômetro, Raio-X, PNG, perfil, perguntas opcionais e recuperação. Mapas/estatísticas preservados; marcadores de Interlagos e abertura do trecho Curva do Sol conferidos visualmente.

Supabase real, com contas e bolão temporários: default race, análise negada a não membro, ingresso de membro, três eventos para primeira apuração e duas correções, autor correto e exclusão de auditoria negada (403). Contexto de piloto limitado a provas anteriores ao GP. Conta e bolão removidos em finally. Metadata antes da conferência: nenhuma extra por sessão ou evento de auditoria em bolões anteriores; sem permissão de escrita direta no histórico ou acesso anônimo às novas análises. Backfill conservador vinculou 22 notícias existentes a circuitos; sync-news publicado com vinculação automática dos próximos itens. Nenhuma fotografia foi acrescentada.

Deploy [40960828627](https://github.com/yurilopesmdv/fi-guesses/actions/runs/40960828627) concluído com sucesso: banco/Edge antes de app. Grupo SDK 58 `6aa42d1b-34bd-4379-ae17-dd1dcc56bbb4`, Android `01a189a5-1cbe-72df-8c7b-0dfc19285011`, iOS `01a189a5-1cbe-7d1d-a91d-c4f858e21172`. Web deployment `bxws9vqrdy`, domínio https://bolao-f1.expo.app. Compatibilidade APK SDK 57: commit `fe091c7` enviado à branch `compat/android-sdk57` antes da publicação; grupo `fbac1da4-56b1-45a4-bb47-231a4402914f`, Android `01a189a3-41e3-7910-b4b6-5a2d7f3771bc`. Manifestos e bundles dos três runtimes retornaram HTTP 200 com os IDs esperados; bundle web novo confirmado.

Na web publicada, usando exclusivamente dados temporários: envio confirmado e persistido no banco, comparação de piloto, simulador com 9 (+3)/4 (-1) pontos e resultado real inalterado, termômetro, Raio-X, download PNG, histórico, perfil e criação opcional de pergunta de classificação. Pergunta de pódio permaneceu Corrida. Sem erros JavaScript em viewport móvel. Na primeira tentativa de exportação, o teste clicou antes de a análise carregar; repetido aguardando a reconstrução, o download passou. As contas e o bolão foram removidos.

Recuperação real validada com link administrativo que não envia e-mail: callback canônico HTTPS, troca da senha, novo login e remoção dos tokens da URL. A chamada HTTP de teste foi ajustada para usar redirect_to na query, como faz o SDK; não houve alteração adicional no produto. Apenas o callback foi acrescentado à configuração existente do Auth. SMTP próprio está ausente: envio para toda a família fica adiado por escolha do usuário em 30/10/2026. Não afirmar que a entrega de e-mails foi ativada; depende de provedor SMTP futuro. Referência: [limites do SMTP padrão do Supabase](https://supabase.com/docs/guides/auth/auth-smtp).

Nenhuma dependência nativa nova: OTA pelos projetos/canal já distribuídos, sem novo QR. Não foi realizado teste em aparelho físico. Retrospectiva exporta imagem na web e texto no app. Book permanece com 15 fotos aprovadas de seis pistas; marcadores no mapa apenas de Interlagos. Alertas, diário do palpite e desafio histórico permanecem excluídos.


Regressão final no domínio publicado: Notícias com manchete real, paginação e curiosidades, acesso à pista, Atuais 23 → Históricas 55 → Caesars Palace → Atuais → Interlagos. Book de seis trechos com foto Curva do Sol carregada, mapa oficial carregado, zoom e créditos. Sem erros JavaScript nem consultas ao monitor OpenF1. Conta temporária removida. O teste passou a selecionar a primeira curiosidade porque a coleta diária já havia acrescentado uma segunda publicação.


## Revisão de UI/UX — 30/10/2026

Revisão de apresentação, sem migration ou alteração de pontuação: ações compactas com ícones, métricas em destaque, regras em expansões acessíveis, comparação integrada aos cartões de piloto e formulário de pódio antes da programação. Notícias conserva a manchete integral e permite expandir/recolher o resumo; autor e atualização das fontes continuam acessíveis. Nenhuma ferramenta foi removida.

64 testes passaram; TypeScript e exportação web aprovados. Navegador móvel com fixtures (390×844 e 360×800): abertura/recolhimento de preparação e metodologias, comparação de dois pilotos sem selecionar acidentalmente o palpite, salvamento confirmado, simulador sem escrita adicional, termômetro, perguntas opcionais, Raio-X/retrospectiva/PNG, perfil e expansão das estatísticas, resumo de notícia e fontes, recuperação e ausência de overflow horizontal. Sem erros JavaScript. Capturas foram inspecionadas, incluindo notícias, ferramentas, comparação e perfil. Sem teste físico em aparelho.

Pesquisa oficial sobre Instagram em [instagram-f1.md](pesquisas/instagram-f1.md): oEmbed de URL pública é viável; descoberta automática exige Business Discovery, conta profissional/token/permissões. Não foi ativado coletor nem adicionada dependência nativa para embeds. O RSS atual segue funcionando.


Código `155b715` enviado à main e port `7801474` enviado à branch compat/android-sdk57 antes de publicar. CI [41047747722](https://github.com/yurilopesmdv/fi-guesses/actions/runs/41047747722) e Deploy [41047747714](https://github.com/yurilopesmdv/fi-guesses/actions/runs/41047747714) concluídos com sucesso. Nenhuma migration foi necessária. TypeScript e exportação Android SDK 57 aprovados.

SDK 58: grupo `8ce65a40-2c0a-49ac-bfd3-969498f27368`, Android `01a18c8e-81f6-737f-97fe-e9317fba53f8`, iOS `01a18c8e-81f6-77e6-ac64-ce2dc2d6ec02`. APK SDK 57: grupo `2ce9c015-02da-47e8-9a52-5b3e86422e03`, Android `01a18c8e-24d9-73a1-94c9-a161803cd30d`. Os três manifestos e bundles retornaram HTTP 200 com esses IDs. Web deployment `ijotfkof13` promovido para https://bolao-f1.expo.app; novo bundle confirmado.

A conferência móvel foi repetida com os assets do domínio publicado e respostas de dados isoladas: ferramentas, expansões, comparação, salvamento simulado, simulador sem escrita adicional, termômetro, perguntas opcionais, Raio-X/PNG, perfil, resumo/fontes em Notícias e recuperação de entrada. Passou sem erros JavaScript ou overflow. Escritas do cenário foram interceptadas; nenhum bolão existente foi alterado por essa conferência. Sem novo binário ou QR code. A primeira tentativa de OTA SDK 57 não encontrou a credencial no checkout compatível; a publicação concluída utilizou a credencial já configurada no projeto principal, somente em memória, sem gravar ou imprimir seu valor.

## Perfil e indicadores — entrega incremental de 30/10/2026

Nova rota `/profile`, acessível pelo avatar em Bolões; editor anterior preservado. Migration 0032 adiciona apenas consulta privada de agregados, sem alteração da pontuação. 67 testes passaram (três SQL novos para perfil): isolamento por usuário/anon, totais e ranking, empates, correções/exclusão, finalização, prazo de classificação independente, resposta incompleta e apuração parcial. TypeScript e exportação web aprovados; TypeScript/exportação Android SDK 57 aprovados.

Navegador móvel 360×800 e 390×844 com fixtures: avatar → perfil, filtros ano/bolão, aproveitamento sem apuração, edição nome/avatar, exclusão de bolão selecionado com recuperação de filtro e falha de atualização mantendo o último resultado. Sem erros JavaScript ou overflow horizontal. Capturas revisadas. Nenhum dado de produção foi alterado nessa validação local. Publicação e conferência remota concluídas conforme registro abaixo.


Código `2ff5ca8` e port SDK 57 `76c1219`, enviados antes de publicar. CI [41092758180](https://github.com/yurilopesmdv/fi-guesses/actions/runs/41092758180) e Deploy [41092758286](https://github.com/yurilopesmdv/fi-guesses/actions/runs/41092758286) concluídos com sucesso. Migration 0032 aplicada no serviço antes do cliente.

SDK 58: grupo `165035f7-8c7d-4a4c-939a-624889f8f178`, Android `01a18db5-e289-704e-953c-ecc93c53e16f`, iOS `01a18db5-e289-742f-8407-1ce57b894b3b`. APK SDK 57: grupo `5b703dc2-0888-4292-b8e4-579108b8f653`, Android `01a18db5-73b2-7cb7-8a96-42b876d896ad`. Web deployment `4i7bs5z3f8` promovido para https://bolao-f1.expo.app. Os três manifestos e bundles retornaram HTTP 200 com os IDs esperados; novo bundle web confirmado.

Conferência real com duas contas e bolão temporários: perfil exclusivo do chamador, anônimo bloqueado (401), outro usuário sem acesso aos agregados do bolão, resultado exato com 9/9 pontos, pódio exato e status finalizado; excluir o bolão removeu seus indicadores e posição geral sem participações. Na web publicada em 390/360: Bolões → avatar → Meu perfil, edição de nome persistida no backend e acesso à análise individual, sem erro JavaScript/overflow. O palpite de prova passada foi semeado administrativamente apenas no bolão temporário de QA; nenhuma regra de prazo foi alterada. Dados esportivos globais/bolões existentes não foram modificados. Contas e bolão de QA removidos em finally.

Caminho comunicado ao usuário: **Bolões → avatar no canto superior direito → Meu perfil**. Nenhum módulo nativo/novo QR; não houve teste em aparelho físico. Acompanhamentos e resumo de GP permanecem como próximas entregas.
