# Tarefas: gestão de bolões, ranking geral e Ao vivo

Solicitação de 16/10/2026. Este documento separa os pedidos, as decisões de implementação e as validações. As alterações do levantamento documental anterior permanecem no checkout.

## 1. Excluir bolão somente como proprietário

- [x] Botão Excluir bolão nas configurações da aba de participantes, visível apenas ao proprietário.
- [x] Confirmação com nome do bolão, consequências, Cancelar e Excluir definitivamente, compatível com web e native via Modal.
- [x] Bloqueio durante envio e mensagem em caso de falha; navegação para Bolões no sucesso.
- [x] Permissão aplicada no banco por RLS, sem depender da visibilidade do botão.
- [x] Cascata remove membros, perguntas, palpites e apurações daquele bolão; não remove contas/perfis, corridas nem resultados esportivos oficiais.
- [x] Links antigos recebem estado de indisponibilidade e ações de tentar novamente/voltar.

Decisão: exclusão definitiva, permitida pelo pedido. Reutiliza FKs `ON DELETE CASCADE`, evitando introduzir flag de ativo e alterar todas as queries/triggers. O cliente exige uma linha retornada pelo DELETE, para não informar sucesso quando RLS negar ou o bolão já não existir. Pontos do bolão excluído desaparecem do ranking geral na próxima consulta.

## 2. Ranking geral de todos os bolões existentes

- [x] Nova aba Ranking, seguindo cartões, cores e tipografia atuais.
- [x] Soma calculada no SQL sobre `pool_standings`, com todos os anos e bolões existentes, inclusive encerrados e bolões em que o consultante não participa.
- [x] Apenas usuários autenticados acessam o RPC; ele retorna agregados, sem abrir acesso às respostas/perguntas de outros bolões.
- [x] Mostra participante, pontos, posição, quantidade de bolões e de apurações; inclui membros com zero pontos.
- [x] Empates em pontos compartilham posição (`rank`, por exemplo 1, 1, 3); nome/UUID estabilizam a ordem de apresentação.
- [x] Consulta ao focar, voltar do segundo plano, atualizar manualmente e a cada 30 s com a tela focada/app ativo; interrompe atualização periódica fora da tela.
- [x] Estados de carregamento, vazio e erro; falha de atualização conserva último resultado e avisa.

Decisão de contagem: o mesmo GP em dois bolões soma duas participações, porque os pontos pertencem a cada bolão. Uma apuração por bolão/corrida é contada separadamente; perguntas extras não multiplicam o número de corridas. Perfis sem associação a nenhum bolão existente não aparecem. Dados vêm de consulta atual, sem tabela/cache materializado. A interface tem atualização periódica, não WebSocket instantâneo.

## 3. Aviso de assinatura e ENABLED para Ao vivo

- [x] `LIVE_ENABLED` em `src/lib/features.ts`, controlado por `EXPO_PUBLIC_LIVE_ENABLED`.
- [x] Padrão desabilitado: só o texto exato `true` habilita.
- [x] Aba permanece disponível com aviso sobre assinatura OpenF1 e orientação para Corridas/F1.
- [x] Com flag desligada, o componente do monitor não é montado; hook e adaptador também impedem chamadas de sessão, autenticação/settings, telemetria e polling do monitor.
- [x] `.env.example` e workflow de deploy documentam/configuram flag; CI usa variable do GitHub com fallback `false`.

Para habilitar, validar assinatura/credenciais antes e publicar bundle com `EXPO_PUBLIC_LIVE_ENABLED=true`. Reiniciar Expo no desenvolvimento. A configuração é de compilação, não mudança dinâmica no banco. Fotos de pilotos importadas na sincronização F1 continuam independentes do monitor; desligar Ao vivo não desliga calendário, resultados nem fotos. A flag não resolve a exposição preexistente de credenciais em `app_settings`; essa pendência permanece no diagnóstico.

## 4. Diferenciar responder e apurar sem redesenho

- [x] Tela da corrida identifica para o dono Modo participante / seu palpite e nomeia o campo Seu palpite de pódio.
- [x] Acesso administrativo passa a dizer Abrir apuração oficial, com explicação da ação.
- [x] Apuração tem banner Modo organizador / apuração oficial, informa impacto na pontuação e permite voltar aos próprios palpites.
- [x] Resultado final e botão Salvar resultados oficiais têm texto explícito; cálculo e formulários existentes foram preservados.
- [x] Guard impede outro membro de abrir o formulário administrativo por URL; RLS existente continua protegendo a escrita.
- [x] Texto de prazo passou a dizer horário de fechamento, respeitando antecedência configurável.

## 5. Ajustes relacionados e limites de entrega

Migration nova: `0017_delete_pool_global_standings.sql`. O schema existente não foi reescrito. A nova RPC usa `security definer` com `search_path` fixo porque o ranking deve agregar bolões além das permissões de associação do chamador; grants são exclusivos para `authenticated` e o corpo exige `auth.uid()`.

As migrations `0017`, `0018` e `0019` foram aplicadas no Supabase compartilhado. App/web publicados e fluxos autenticados exercitados com contas e bolões temporários. Detalhes em [validação de produção](VALIDACAO_PRODUCAO.md).

## Validações

| Camada | Critério | Resultado |
|---|---|---|
| SQL real isolado | Aplicar migrations, respeitando extensão ausente de cron no PGlite | 16 cenários executados e aprovados; sem `.env`/rede/produção |
| RLS de exclusão | Dono exclui; membro/outro usuário/anônimo não excluem | Aprovado em PostgreSQL em memória |
| Cascata | Remover dados exclusivos do bolão e conservar perfis/corridas | Aprovado |
| Ranking | Somar anos/bolões, empate, zero, GP repetido, correção, exclusão, ausência de sessão e vazio | Aprovado |
| Tipo/compilação | Typecheck e exportação web | Aprovados em Node 20.19.5; bundle final em `/tmp/bolao-f1-tasks-web` |
| Navegador | Aviso Ao vivo sem chamadas, ranking e atualização, exclusão e distinção dos modos | Cinco fluxos aprovados no Chromium/Playwright, com serviços simulados e viewport 390×844 |
| Visual | Ranking, aviso, confirmação e identificação de apuração | Capturas revisadas; cartões, cores e navegação existentes preservados |
| Documentação | Links e whitespace | 13 documentos, zero links locais inválidos; `git diff --check` aprovado |
| Publicação/produção | Aplicar migration e validar em serviço publicado/aparelhos | Backend e web exercitados; aparelho físico não testado pelo agente |

Testes SQL reproduzíveis: `npm ci` → `npm test`, em Node compatível (20.19.5 validado). Usam `node:test` e PGlite, um PostgreSQL em memória. Aplicam todas as migrations; em `0010` preservam a função de apuração e omitem só agendamento `pg_cron`/`pg_net`, extensões não disponíveis nesse runtime. Roles e `auth.uid()` são simulados no banco para exercer as policies. O CI passou a executar esses testes além do TypeScript.

Validação de navegador executada com conta e respostas HTTP fictícias, sem acesso externo: aviso Ao vivo sem login e sem qualquer requisição externa; ranking com atualização automática via relógio simulado e atualização manual, estado vazio e falha conservando dados; timer parado ao sair da aba; exclusão cancelada sem DELETE e confirmação com retorno à home; link excluído com estado de erro; membro sem botão de exclusão e sem formulário administrativo; palpite do dono gravando somente `predictions`, e apuração gravando somente `results`. Nenhum erro JavaScript de página foi registrado nesses fluxos. Não substitui teste em Android/iPhone nem execução contra a instância Supabase publicada.

## 6. Distinguir andamento e finalização; ordenar por recência

- [x] Separar Meus bolões em Em andamento e Finalizados, com destaque verde para os em andamento.
- [x] Ordenar por criação mais recente em cada grupo, priorizando os em andamento; catálogo segue a mesma regra.
- [x] Mostrar status também dentro do bolão e explicar apuração pendente/calendário futuro.
- [x] Não confundir fechamento de palpites com finalização: só finaliza sem corridas futuras e com todas as perguntas apuradas, incluindo pódio completo.
- [x] Atualizar status ao focar/retomar, a cada 30 s na tela ativa e após salvar apuração.
- [x] Migration `0019` aplicada; testes para GP, temporada, calendário ausente, pódio parcial, extras e autenticação.

Validação automatizada atual: 24 testes (16 SQL/RLS, 6 handler HTTP e 2 helpers de status). TypeScript e exportação web aprovados. A validação inicial simulada acima foi complementada por testes autenticados reais, descritos no relatório de produção.
