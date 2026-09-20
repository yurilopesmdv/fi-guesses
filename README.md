# Bolão F1

App de bolão de Fórmula 1 para a família: palpite de pódio (3 pts exato · 1 pt piloto certo), perguntas extras do organizador, ranking, tabela de palpites da galera, calendário com horários em Brasília, campeonato (histórico desde 1950), F2/F3 e monitor ao vivo.

| | |
|---|---|
| App | Expo (React Native) · TypeScript · expo-router |
| Backend | Supabase — Postgres + RLS, Auth, Edge Function, pg_cron |
| Dados | Jolpica (F1), API/sites oficiais (F2/F3), OpenF1 (ao vivo) |
| Distribuição | EAS Update · EAS Hosting (web) · APK Android |

## Rodar localmente

```bash
cp .env.example .env    # preencher URL e anon key do Supabase
npm install
npx expo start
```

## Comandos

| Comando | O que faz |
|---|---|
| `npm run typecheck` | TypeScript |
| `npm run db:migrate` | aplica migrations pendentes no Supabase |
| `npm run db:sql "select …"` | SQL ad hoc |
| `npm run sync:f1 2024` · `npm run sync:f2f3 f2` | importa dados manualmente |
| `npm run publish` | publica JS (EAS Update) |
| `npm run web:deploy` | publica web + página de convite |

## Deploy

Push na `main` → [GitHub Actions](.github/workflows/deploy.yml) publica app, web e (quando `supabase/` muda) banco + Edge Function. Instalação nos aparelhos: [INSTALACAO.md](INSTALACAO.md). Convenções e arquitetura: [CLAUDE.md](CLAUDE.md). Plano original: [PLANO.md](PLANO.md).
