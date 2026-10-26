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
