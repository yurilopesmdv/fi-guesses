# Bolão F1 — guia para agentes e contribuidores

App de bolão de Fórmula 1 para uso familiar (iPhone via Expo Go, Android via APK, web). Foco: F1. F2/F3 são bônus (calendário, horários, classificação).

## Stack
- **App**: Expo SDK 57 (React Native 0.86) + TypeScript + expo-router. Node 20.
- **Backend**: Supabase — Postgres com RLS, Auth (e-mail+senha, sem confirmação), Edge Function `sync-series`, pg_cron.
- **Dados**: Jolpica (F1, histórico 1950→), API pública da F1 + sites oficiais (F2/F3, temporada atual), OpenF1 (ao vivo; tempo real exige assinatura).
- **Distribuição**: EAS Update (canal `preview` = canal de produção da família), EAS Hosting (web + página de convite), APK arm64 no Storage do Supabase.

## Estrutura
```
src/app            telas (expo-router): (tabs)/ = Bolões · Corridas · Campeonato · Ao vivo; pool/[id] = bolão; race/[id] = corrida
src/components     Podium, DriverPicker, QuestionField, PositionPicker, RaceView, PicksBoard, Schedule, live
src/lib            supabase.ts (cliente), repo.ts (acesso a dados — único lugar com queries), f1api.ts, openf1.ts, hooks
src/ui             tema e primitivos
supabase/migrations  schema, RLS, funções SQL (pontuação, apuração automática, cron) — numeradas, nunca editar uma aplicada
supabase/functions   sync-series (Deno) + _shared (f1api.ts é cópia de src/lib/f1api.ts — manter iguais)
scripts            operação: setup-supabase (migrations), sql, sync-f1, sync-f2f3, sync-all, upload-apk
site/entrar.html   página de convite (deep link + download do APK)
```

## Regras do projeto
- **Segredos nunca no repo**: `.env` é gitignored; no CI são secrets. `service_role` só existe em memória nos scripts. A `anon key` é pública por desenho.
- **Regras de negócio no SQL**: pontuação (`score_answer`), ranking (views), apuração automática (`auto_settle_podiums`), permissões (RLS). O app não recalcula pontos — só exibe.
- **Toda query passa por `src/lib/repo.ts`** e filtra por `series` nas tabelas de dados da F1 (`races`, `drivers`, `race_results`, `driver_standings`, `constructor_standings`, `f1_sync`).
- **Horários sempre em Brasília** (`America/Sao_Paulo`) via `src/lib/format.ts`, independentemente do fuso do aparelho.
- **Bolões são só F1**. Triggers e RPCs já filtram `series = 'f1'`.
- **Nunca compartilhar link `exp://u.expo.dev/update/<id>`** (fica preso numa versão). Compartilhar o QR/link do canal ou o convite do app.
- Mudança nativa (novo módulo, config de plugin) exige novo APK: `eas build -p android --profile preview` → `node scripts/upload-apk.mjs <apk>`; JS puro vai por EAS Update.
- Commits: Conventional Commits em português (`feat:`, `fix:`, `docs:`, `chore:`), um assunto por commit.

## Fluxo
- **Local**: `npm install` → `.env` (ver `.env.example`) → `npx expo start`. Typecheck: `npm run typecheck`.
- **Banco**: nova migration em `supabase/migrations/NNNN_nome.sql` → `npm run db:migrate` (idempotente, registra em `_migrations`). SQL ad hoc: `npm run db:sql "select …"`.
- **Deploy**: push na `main` → GitHub Actions publica JS (EAS Update), web (EAS Hosting) e, se `supabase/` mudou, migrations + Edge Function. Manual: `npm run publish`, `npm run web:deploy`.
- **Dados**: o cron `sync-series-hourly` sincroniza F1/F2/F3 e apura pódios a cada hora. Manual: botão ↻ no app ou `POST /functions/v1/sync-series`.

## Secrets/variáveis do CI (GitHub → Settings → Secrets and variables → Actions)
Secrets: `EXPO_TOKEN`, `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_ACCESS_TOKEN`.
Variables: `SUPABASE_PROJECT_REF`, `APK_URL`.
