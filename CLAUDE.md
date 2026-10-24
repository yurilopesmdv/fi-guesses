# Bolão F1 — guia para agentes e contribuidores

App de bolão de Fórmula 1 para uso familiar (iPhone via Expo Go, Android via APK, web). Foco: F1. F2/F3 são bônus (calendário, horários, classificação).

Documentação detalhada e diagramas: [docs/README.md](docs/README.md). Consulte também o [diagnóstico de 16/10/2026](docs/DIAGNOSTICO.md), que distingue implementação, verificações e pendências de infraestrutura. O plano original é histórico.

## Stack
- **App**: Expo SDK 58 (React Native 0.88) + TypeScript + expo-router. Node 22.13+ na linha 22; ambiente local fixado em 22.23.2 via .nvmrc. Node 20 e anteriores não são suportados pelo SDK 58.
- **Backend**: Supabase — Postgres com RLS, Auth (e-mail+senha, sem confirmação), Edge Function `sync-series`, pg_cron.
- **Dados**: Jolpica (F1, histórico 1950→), API pública da F1 + sites oficiais (F2/F3, temporada atual), OpenF1 (ao vivo; tempo real exige assinatura).
- **Distribuição**: EAS Update (canal `preview` = canal de produção da família), EAS Hosting (web + página de convite), APK arm64 no Storage do Supabase.

## Estrutura
```
src/app            telas (expo-router): (tabs)/ = Bolões · Ranking geral · Corridas · Campeonato · Ao vivo; pool/[id] = bolão; race/[id] = corrida
src/components     Podium, DriverPicker, QuestionField, PositionPicker, RaceView, PicksBoard, Schedule, live
src/lib            supabase.ts (cliente), repo.ts (principal camada de queries), f1api.ts, openf1.ts, hooks
src/ui             tema e primitivos
supabase/migrations  schema, RLS, funções SQL (pontuação, apuração automática, cron) — numeradas, nunca editar uma aplicada
supabase/functions   sync-series (Deno) + _shared (f1api.ts é cópia de src/lib/f1api.ts — manter iguais)
scripts            operação: setup-supabase (migrations), sql, sync-f1, sync-f2f3, sync-all, upload-apk
site/entrar.html   página de convite (deep link + download do APK)
```

## Regras do projeto
- **Segredos nunca no repo**: `.env` é gitignored; no CI são secrets. A `anon key` é pública por desenho; service role é privilegiada e usada na função/upload. `app_settings` é legível por todos os autenticados, inclusive credenciais OpenF1 se presentes; não é armazenamento secreto.
- **Fonte do ranking no SQL**: pontuação (`score_answer`), ranking (views), apuração automática (`auto_settle_podiums`), permissões (RLS). `PicksBoard` e `Podium` também calculam pontos/marcações para exibição; revisar ao mudar a regra.
- **Novas queries em `src/lib/repo.ts`**, filtrando por categoria/temporada. Exceções atuais: pódios em `(tabs)/races.tsx`, settings em `openf1.ts` e Auth direto. As políticas atuais permitem escrita ampla nas tabelas esportivas por autenticados.
- **Horários sempre em Brasília** (`America/Sao_Paulo`) via `src/lib/format.ts`, independentemente do fuso do aparelho.
- **Bolões são só F1**. Triggers e RPCs já filtram `series = 'f1'`.
- **Palpites são visíveis antes do fechamento** para os membros (`0007`). O prazo de escrita continua protegido no banco.
- **Exclusão** pelo proprietário, com Modal de confirmação e RLS (`0017`), remove filhos em cascata. Ranking geral autenticado soma todos os bolões existentes/anos via `global_standings()`, inclusive encerrados; GP em dois bolões conta duas vezes. Atualiza a cada 30 s com a tela ativa.
- **Ao vivo desligado por padrão**: `LIVE_ENABLED` deriva de `EXPO_PUBLIC_LIVE_ENABLED === 'true'`. Desligado, não montar/iniciar monitor nem autenticação/polling; importação de fotos é independente. Publicar novo bundle para mudar a flag.
- **Nunca compartilhar link `exp://u.expo.dev/update/<id>`** (fica preso numa versão). Compartilhar o QR/link do canal ou o convite do app.
- Mudança nativa (novo módulo, config de plugin) exige novo APK: `eas build -p android --profile preview` → `node scripts/upload-apk.mjs <apk>`; JS puro vai por EAS Update.
- Commits: Conventional Commits em português (`feat:`, `fix:`, `docs:`, `chore:`), um assunto por commit.

## Fluxo
- **Local**: Node compatível → `npm ci` → `.env` (ver `.env.example`) → `npx expo start`. Typecheck: `npm run typecheck`; exclui Deno/SQL/scripts. `npm test` executa 24 cenários (16 SQL/RLS, 6 handler HTTP, 2 helpers de status); CI inclui ambos.
- **Banco**: nova migration em `supabase/migrations/NNNN_nome.sql` → `npm run db:migrate -- REF` (registra em `_migrations`; também configura Auth e regrava `.env` fora do CI). SQL ad hoc: `npm run db:sql -- "select …"`.
- **Deploy**: push na `main` → GitHub Actions publica JS (EAS Update), web (EAS Hosting) e, se `supabase/` mudou, migrations + Edge Function. Manual: `npm run publish`, `npm run web:deploy`.
- **Dados**: o cron declarado `sync-series-hourly` chama F1/F2/F3 no minuto 05 de cada hora e apura pódios. Precisa de `functions_url` e `anon_key` em `app_settings`, não preenchidos pelo setup. Manual: botão ↻ ou `POST /functions/v1/sync-series`. Cron confirmado, timeout de 120 s e respostas reais HTTP 200 sem timeout. Função versão 8 com JWT e CORS validados.
- **Deploy manual web**: `npm run web:deploy` prepara convite/link APK e usa o token de `.env`; seguir [operação](docs/INFRA_OPERACAO.md). Sintaxe de `sync-all.mjs` corrigida.

## Secrets/variáveis do CI (GitHub → Settings → Secrets and variables → Actions)
Secrets: `EXPO_TOKEN`, `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_ACCESS_TOKEN`.
Variables: `SUPABASE_PROJECT_REF`, `APK_URL`.
Variable opcional: `EXPO_PUBLIC_LIVE_ENABLED` (`false` por padrão). Migrations até `0019` aplicadas. Status via `pool_lifecycles`: Em andamento primeiro; criação desc dentro dos grupos. Fechamento de palpites não finaliza. Evidências em [docs/VALIDACAO_PRODUCAO.md](docs/VALIDACAO_PRODUCAO.md).
