# Bolão F1

App de bolão de Fórmula 1 para a família: palpite de pódio (3 pts exato · 1 pt piloto certo), perguntas extras do organizador, ranking por bolão e geral, tabela de palpites da galera, calendário com horários em Brasília, campeonato (histórico desde 1950), F2/F3 e monitor ao vivo opcional.

| | |
|---|---|
| App | Expo (React Native) · TypeScript · expo-router |
| Backend | Supabase — Postgres + RLS, Auth, Edge Function, pg_cron |
| Dados | Jolpica (F1), API/sites oficiais (F2/F3), OpenF1 (ao vivo) |
| Distribuição | EAS Update · EAS Hosting (web) · APK Android |

## Rodar localmente

Use Node **20.19.4 ou superior compatível**; o levantamento foi validado com 20.19.5. O `.env` define o backend acessado, inclusive durante desenvolvimento local.

```bash
cp .env.example .env    # preencher URL e anon key do Supabase
npm ci
npx expo start
```

## Documentação

O [índice completo](docs/README.md) reúne [produto e jornadas](docs/PRODUTO.md), [arquitetura e diagramas](docs/ARQUITETURA.md), [modelo de dados e permissões](docs/DADOS.md), [desenvolvimento](docs/DESENVOLVIMENTO.md), [infraestrutura e operação](docs/INFRA_OPERACAO.md) e [diagnóstico com evidências e pendências](docs/DIAGNOSTICO.md).

Ambiente e fluxos validados em 16/10/2026: Supabase, sincronização F1/F2/F3, cron, integração autenticada e web publicada. Migrations até `0019` aplicadas. Evidências e limites em [validação de produção](docs/VALIDACAO_PRODUCAO.md); pendências estruturais em [diagnóstico](docs/DIAGNOSTICO.md).

As [tarefas e validações](docs/TASKS.md) registram exclusão pelo proprietário, nova aba Ranking geral e identificação dos modos palpite/apuração. Incluem status Em andamento/Finalizado e ordenação por criação com prioridade para os em andamento (`0019`). O monitor Ao vivo fica desligado por padrão: `EXPO_PUBLIC_LIVE_ENABLED=true` habilita em novo bundle, após validar a assinatura OpenF1.

## Comandos

| Comando | O que faz |
|---|---|
| `npm run typecheck` | TypeScript |
| `npm test` | testes SQL/RLS em PostgreSQL em memória, sem acessar produção |
| `npm run db:migrate -- REF` | aplica migrations, configura Auth e atualiza `.env` fora do CI |
| `npm run db:sql "select …"` | SQL ad hoc |
| `npm run sync:f1 2024` · `npm run sync:f2f3 f2` | importa dados manualmente |
| `npm run publish` | publica JS (EAS Update) |
| `npm run web:deploy` | publica web + convite com link APK preparado pelo mesmo script do CI |

## Deploy

Push na `main` → [GitHub Actions](.github/workflows/deploy.yml) publica JS no canal `preview`, web e (quando `supabase/` muda) banco + Edge Function. O app aguarda o job backend e passa por TypeScript/testes antes de publicar; APK exige build separado. Procedimentos: [infraestrutura e operação](docs/INFRA_OPERACAO.md). Instalação: [INSTALACAO.md](INSTALACAO.md). Contexto para contribuidores: [CLAUDE.md](CLAUDE.md) e [AGENTS.md](AGENTS.md). [PLANO.md](PLANO.md) preserva o plano histórico.
