# Diagnóstico do levantamento

Data: **16/10/2026**, fuso de referência America/Sao_Paulo. Código-base: `f3c4bff`. A árvore Git estava limpa antes do levantamento. Este trabalho acrescenta documentação; não executou migrations, importações de dados, publicação ou alteração de configurações remotas.

Este diagnóstico preserva o levantamento inicial, anterior às correções. O estado atual e os testes contra o serviço estão em [VALIDACAO_PRODUCAO.md](VALIDACAO_PRODUCAO.md). Foram resolvidos token 401 (substituído pelo usuário), sintaxe de sync-all, preparação do convite, CORS/erros de sync, timeout do cron e interpolação de mensagem no CI. Migrations até `0019` aplicadas; as afirmações de ausência de publicação abaixo são históricas.

## O que foi investigado

Rotas, layouts, componentes, tema, hooks, acesso ao banco, autenticação, integração F1/F2/F3/OpenF1, dezesseis migrations, Edge Function, scripts administrativos, arquivos Expo/EAS/TypeScript, workflow CI/deploy, convite HTML, instruções existentes e estrutura local. Os testes abaixo usam as dependências já instaladas, sem reinstalação pelo lockfile nesta sessão.

| Verificação | Resultado |
|---|---|
| `npm run typecheck` | Passou, sem erros; não cobre Deno/SQL/scripts `.mjs` |
| `node --check` nos scripts `.mjs` e plugin JS | `sync-all.mjs` falhou por aspas SQL inválidas na linha 7; demais arquivos passaram |
| Comparação dos dois `f1api.ts` | Cópias idênticas |
| Links locais da documentação | 12 documentos verificados, nenhum destino inválido |
| Revisão de whitespace | `git diff --check` passou; arquivos novos também conferidos |
| Exportação web no Node padrão 18.13.0 | Falhou: versão incompatível e `util.parseEnv` ausente |
| Exportação web no Node 20.19.5 | Passou; artefato em `/tmp/bolao-f1-audit-web`, sem publicação |
| Site e convite publicados | GET HTTP 200 em ambos |
| Placeholder APK na página publicada | Ausente; o CI aparentemente gerou a substituição, mas não se confirmou qual execução publicou a página |
| Objeto APK público | HEAD HTTP 200; não houve download/instalação/validação de assinatura |
| Configuração pública Supabase Auth | HTTP 200; e-mail habilitado e `mailer_autoconfirm: true` |
| Credencial Supabase administrativa local | Management API retornou 401 nas consultas de projeto, funções e migrations/metadados |
| Credenciais em saída/documentação | Nenhum valor de token/senha/chave administrativa registrado; somente nomes e presença |
| Interface funcional em aparelhos/browser | Não exercitada com login nem com escrita em produção |

HTTP 200 comprova alcance dos endpoints no momento da consulta; não garante que todas as jornadas do produto estejam funcionais. O build comprova compilação da SPA, não integração completa. Sem acesso administrativo válido, não se pode afirmar que o schema remoto corresponde às migrations locais.

## Pendências para atuação futura

As prioridades abaixo indicam ordem sugerida a partir do código; são pendências identificadas, **não correções realizadas**. Questões de permissão refletem o schema versionado, sem exploração contra usuários ou escrita em produção.

| Prioridade | Achado e impacto | Evidência / encaminhamento |
|---|---|---|
| Alta | `app_settings` expõe qualquer valor para todos os autenticados; se houver credenciais OpenF1, os usuários conseguem lê-las | Migration `0006`, `src/lib/openf1.ts`; mover autenticação sensível ao servidor e revisar grants/settings |
| Alta | Qualquer autenticado pode alterar/excluir dados esportivos globais | Policies `FOR ALL` de `0001`/`0002`, não restringidas depois; revisar escritores autorizados e importação no cliente |
| Alta | Token administrativo local não permite inspecionar o backend | HTTP 401; substituir/validar por canal seguro e conferir migrations, cron, função, região e backup; o motivo exato do 401 não foi determinado |
| Tratada nas tarefas | Cliente podia publicar antes do banco | `deploy.yml` passou a exigir conclusão do job Supabase antes do job app e testes SQL antes de publicar; rollout real ainda não executado |
| Média | `sync-all.mjs` não inicia | Erro de sintaxe confirmado: literal SQL com `'f1'` dentro de string de aspas simples; corrigir antes de usar backfill |
| Média | Deploy web manual deixa link de APK como placeholder | `package.json` copia HTML sem substituição; o workflow faz a substituição; unificar preparação de artefato |
| Média | Função pode anunciar sucesso com falhas por categoria ou na apuração | `sync-series/index.ts`, `repo.syncSeries`; validar corpo, propagar erros e testar estado parcial |
| Média | Rotas protegidas de forma desigual | Ausência de guard nos layouts principal/bolão; algumas consultas começam antes de validar sessão; centralizar autenticação e estados de erro |
| Média | Navegação de bolão histórico usa calendário/pilotos do ano atual | `usePool` depende de `useSeason`, sem carregar `pool.season`; testar virada anual e bolões antigos |
| Média | Setup de migrations tem efeitos extras e configuração não reproduzível integralmente | Desliga confirmação de e-mail/regrava `.env`; settings do cron não são populados; separar responsabilidades/documentar provisionamento |
| Média | Cobertura automatizada ainda parcial | Após as tarefas, CI inclui nove cenários SQL/RLS de exclusão/ranking; Deno e `.mjs` continuam fora do typecheck e não há testes de integração remota |
| Média | Mensagem de commit é interpolada diretamente em comando shell no CI | Passo EAS Update em `deploy.yml`; passar texto por variável de ambiente/argumento com quoting apropriado |
| Média | Runtime por SDK não distingue toda mudança nativa | `app.json`, canal único preview; revisar estratégia antes de introduzir módulos/plugins incompatíveis |
| Média | Importação pode falhar parcialmente e não remover dados obsoletos | Upserts sem transação global/reconciliação; revisar consistência após alterações da fonte e exclusões |
| Média | Dados históricos e estatísticas são aproximados/conforme cobertura | Identidade por sigla/temporada, calendário incompleto, status/classificação, pontos sem sprint; explicitar limitações e validar amostras |
| Baixa | Regras/código duplicados podem divergir | `score_answer` versus `PicksBoard`/`Podium`; adaptadores F1 duplicados e F2/F3 em script/Edge; manter contratos e verificações |
| Baixa | Horário Brasília não é aplicado em toda metadata da UI | `(tabs)/f1.tsx` e home usam `toLocaleString` sem timeZone para atualização/versão; helpers de sessões usam Brasília |
| Baixa | Polling ao vivo pode sobrepor ciclos e manter sessão antiga até refresh | `useLive`, fila de chamadas sem trava de ciclo; revisar concorrência e transição entre sessões |

Outros cuidados: `answer jsonb` tem pouca validação no banco; índices/constraints não validam todas as regras da UI. A diferença numérica de ±1 também vale entre posição zero (DNF) e posição 1. `set_at` não possui trigger de atualização nas edições de resultado. Não há retry persistente/flush explícito dos timers de autosave ao sair da tela. Desempate e distribuição de prêmios não são recursos implementados.

## O que falta confirmar nas contas de nuvem

Com credenciais válidas, consultar a situação de todas as migrations `0001`–`0016`, definição real das políticas/grants, settings necessários sem expor valores, cron ativo e histórico de respostas, função publicada e configuração JWT/CORS, região e plano Supabase, capacidade de backup/restauração, versões EAS e APK, permissões/assinatura, secrets do CI, proteção de branch e último resultado dos dois jobs de deploy. Não há necessidade de repetir mudanças para obter essas evidências: começar pelas leituras administrativas.

Não foram medidos custos/cotas atuais, desempenho de consultas históricas em produção, cobertura de todos os anos, compatibilidade de Expo Go em cada aparelho nem funcionamento durante uma sessão real. Não foi feita auditoria de dependências, teste de invasão, restauração, teste de carga ou build nativo.

## Correções documentais concluídas

A documentação passa a diferenciar plano histórico e implementação; registra palpites visíveis, login por senha, cálculo visual de pontos no cliente, exceções ao repositório de queries, seleção aproximada de F2/F3, Node mínimo, comportamento parcial da sincronização, efeitos do setup, configuração manual do cron, destinos de publicação e limites das verificações remotas. O [índice](README.md) reúne os guias para as próximas tarefas.
