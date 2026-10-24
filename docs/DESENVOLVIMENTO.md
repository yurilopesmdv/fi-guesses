# Desenvolvimento e manutenção

## Preparar o ambiente

O projeto usa Expo SDK 58 e React Native 0.88. A CLI exige Node `^22.13.0 || ^24.3.0 || >=26.0.0`. O CI usa Node 22 e o `.nvmrc` fixa **22.23.2** para desenvolvimento. Node 20 e anteriores não são suportados pelo SDK 58.

```bash
# Se usar nvm e a versão já estiver instalada:
nvm use
node --version
npm ci

# Apenas em checkout novo; preserve um .env existente:
cp .env.example .env
# Preencha EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY.
npm start
```

`npm ci` reproduz o lockfile. `npm install` é apropriado quando a intenção é alterar dependências e revisar o lockfile. O projeto aponta para o Supabase escolhido no `.env`; rodar localmente não cria um banco isolado. Com as URLs atuais, o cliente local utiliza o mesmo backend da família.

Para rodar o app, bastam as duas variáveis públicas. Tokens administrativos só são necessários para operação/publicação. O Expo incorpora variáveis `EXPO_PUBLIC_*` no bundle. Nunca coloque service role, senha ou token administrativo com esse prefixo. A sessão usa AsyncStorage; não há armazenamento seguro criptografado específico no código.

Não há `supabase/config.toml`, seed, stack Docker, banco de testes ou configuração Supabase local completa. As migrations são a fonte para reconstruir o schema, mas configuração de conta, Storage, settings e função exigem preparação adicional descrita em [infraestrutura](INFRA_OPERACAO.md).

## Comandos existentes

| Comando | Efeito |
|---|---|
| `npm start` | Metro/Expo para desenvolvimento |
| `npm run android`, `npm run ios` | Expo abre a plataforma; requer aparelho/emulador compatível |
| `npm run web` | Servidor web de desenvolvimento |
| `npm run typecheck` | `tsc --noEmit`; exclui `supabase/functions` |
| `npm test` | Cenários SQL/RLS em PostgreSQL em memória via PGlite, sem `.env` ou rede |
| `npm run lint` | Alias para `expo lint`; não há ESLint/configuração explícitos versionados e não é check do CI |
| `npx expo export --platform web --output-dir /tmp/bolao-f1-web` | Compila SPA sem publicar |
| `npm run db:migrate -- REF_DO_PROJETO` | Aplica migrations e também altera configuração Auth e, fora do CI, regrava URL/anon no `.env` |
| `npm run db:sql -- "select ..."` | Executa SQL administrativo no backend do `.env` |
| `npm run sync:f1 -- 2026` | Importa temporada F1 via Management API |
| `npm run sync:f2f3 -- f2 2026` | Importa F2; aceita `f3`; usa dados do site atual |
| `npm run publish -- --message "descrição"` | Publica OTA no canal `preview` |
| `npm run web:deploy` | Exporta e publica web; link APK preparado por `prepare-web.mjs` |

Scripts adicionais: `npx tsx scripts/backfill-driver-ids.mjs` preenche identidades históricas; `node scripts/upload-apk.mjs arquivo.apk` substitui APK público. `sync-all.mjs` importa anos ausentes; o erro de sintaxe identificado foi corrigido. Backfill completo não foi executado. Scripts que importam `.ts` devem passar por `tsx` com Node 22.

O parser de `.env` dos scripts é manual e não equivale ao parser da CLI Expo; use valores simples, sem comentários na mesma linha. Exceto `setup-supabase`, os scripts administrativos consultados dependem diretamente do arquivo `.env`, sem fallback geral para `process.env`. Não os reutilize no CI apenas injetando variáveis sem adaptar esse comportamento.

## Onde fazer cada tipo de alteração

| Tarefa | Pontos principais |
|---|---|
| Nova tela/rota | `src/app`, layouts de navegação e `src/lib/nav.ts` quando aplicável |
| Novo campo/regra | Nova migration, `types.ts`, funções em `repo.ts`, formulário e documentação |
| Pontuação | `score_answer` em nova migration, views relacionadas, `PicksBoard` e `Podium` |
| Novo dado F1 | `src/lib/f1api.ts` e cópia em `_shared/f1api.ts`; conferir script e Edge Function |
| Dados F2/F3 | `_shared/f2f3.ts` e `scripts/sync-f2f3.mjs` |
| Visual | Reutilizar `src/ui/theme.ts` e `primitives.tsx`, depois componentes específicos |
| Convite/domínio/SDK | `invite.ts`, `site/entrar.html`, `app.json`, workflow e guia de instalação |
| Distribuição nativa | `app.json`, `eas.json`, plugin Android; gerar APK compatível |

Prefira centralizar novas consultas em `repo.ts`. Exceções atuais: consulta de pódios em `(tabs)/races.tsx`, settings em `openf1.ts` e autenticação direta. Não presuma que todas as queries já foram centralizadas. Filtros esportivos devem considerar categoria e temporada; busca por UUID de corrida já identifica uma linha específica.

Para alterar um contrato SQL, confira consumidores do RPC e a serialização JSON. RPCs retornam tipos declarados manualmente. Para identidades, use `driver_id` entre temporadas e sigla apenas dentro da temporada; equipe usa nome normalizado. Mantenha horários das sessões em UTC no banco e formate pelo helper Brasília.

## Validação proporcional à mudança

O CI executa instalação, TypeScript e `npm test`. A suíte `tests/pools.test.mjs` cobre 16 cenários SQL/RLS de exclusão, cascata, ranking, status de bolões e autenticação em PostgreSQL em memória via PGlite. Aplica migrations reais; de `0010`, omite o agendamento externo de `0010` e a alteração de cron em `0018` (`pg_cron`/`pg_net`). Roles e `auth.uid()` são simulados. Não há linter obrigatório, validação Deno ou smoke test automatizado de deploy. Typecheck sozinho não garante funcionamento das regras SQL e dos scripts `.mjs`.

Para documentação, confira links, caminhos, exemplos, segredos e `git diff --check`. Para código TypeScript, execute `npm run typecheck`; para alterações de tela/rotas/configuração, exporte web e percorra o fluxo afetado em desenvolvimento. Alterações nativas exigem verificar build/aparelho. Para scripts, use `node --check caminho.mjs` antes de qualquer execução contra a nuvem.

Para novas regras de acesso/pontuação, valide em um banco isolado: usuário membro, não membro e dono; antes/depois do prazo; palpite vazio/parcial/completo; resultado manual/automático; 3 pontos exatos, 1 ponto em outra posição, bônus e quase-acerto. Estenda os testes SQL nos cenários relacionados; ainda não há cobertura completa de pontuação, cron ou integração remota.

O monitor Ao vivo é controlado por `EXPO_PUBLIC_LIVE_ENABLED`, false por padrão. No desenvolvimento, configurar no `.env` e reiniciar Expo; na distribuição, configurar no ambiente de publicação e gerar novo bundle. A flag só habilita com o texto exato `true`. Testar desligado sem requisições ao provedor antes de habilitar com assinatura validada.

Percurso manual de referência: login → criar bolão/entrar por código → salvar palpite e reabrir → visualizar quadro → organizar perguntas/apurar → confirmar ranking → convite com e sem sessão → calendário/ano/categoria → piloto/equipe/comparação → Ao vivo. Casos que escrevem no banco devem usar dados e ambiente de teste.

## Processo e limites de compatibilidade

Use Conventional Commits em português, um assunto por commit, conforme convenção existente. Atualize documentação junto do comportamento. PRs passam pelo CI; push na `main` já dispara publicação automática. Não há evidência local de proteção de branch ou aprovação de ambiente configurada no GitHub.

Uma alteração JavaScript compatível com o runtime pode seguir por OTA. Novo módulo nativo, plugin ou configuração nativa exige novo binário. O runtime usa política `sdkVersion`, que não captura sozinho toda alteração nativa dentro do mesmo SDK; planeje a compatibilidade entre APK antigo e atualização publicada. O perfil chamado `production` existe, mas o fluxo operacional publicado no repositório usa `preview`.

A suíte completa tem 26 testes: 16 SQL/RLS, 6 do handler HTTP de sincronização, 2 dos helpers de status/ordenação e 2 do provider do bolão (calendário lento/ano correto e recuperação de erro). `scripts/eas.mjs` carrega `.env` com parser nativo de Node 22 e preserva precedência das variáveis do processo. `scripts/prepare-web.mjs` prepara convite/link APK de forma idêntica no CI e manualmente. `scripts/deploy-function.mjs` empacota com esbuild e publica via Management API com verificação JWT habilitada.
