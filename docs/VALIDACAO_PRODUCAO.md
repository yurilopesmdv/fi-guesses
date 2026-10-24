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


## Compatibilidade Android SDK 57 — 24/10/2026

A branch `compat/android-sdk57` preserva o código da correção do calendário publicada para o APK instalado, mantendo as dependências do SDK 57. A principal `main` segue no SDK 58. O detalhe do bolão carrega seu próprio calendário F1 por `pool.season`, aguarda os dados e oferece nova tentativa em caso de falha. Sem alteração de banco nem novo APK.

Publicação no canal/branch EAS `preview`, runtime `exposdk:57.0.0`, grupo `4b782f62-2c67-4dd6-8675-d2391a49d802`, update Android `01a16fe7-ce69-706e-a3af-defc5ce14c0f`. TypeScript e exportação Android aprovados nesta combinação de fontes/dependências. Manifesto e download do bundle conferidos com HTTP 200. Os dois testes novos do provider foram executados na linha SDK 58; a confirmação no aparelho físico fica com o usuário.
