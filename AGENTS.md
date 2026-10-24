# Contexto para trabalho no Bolão F1

Antes de alterar o projeto, consulte [docs/README.md](docs/README.md), [docs/DESENVOLVIMENTO.md](docs/DESENVOLVIMENTO.md) e [docs/DIAGNOSTICO.md](docs/DIAGNOSTICO.md). Produto, arquitetura, dados e operação têm guias próprios nesse índice. O levantamento-base é de 16/10/2026; confira o código ao evoluir comportamentos.

- Expo/React Native/TypeScript; Supabase gerenciado. SDK 58 exige Node 22.13+ na linha 22; use `nvm use` (22.23.2). CI em Node 22.
- Antes de publicar, faça commit e push do código validado para o GitHub. A branch principal é `main`; ela deve refletir o código publicado. Hotfix para runtime antigo também deve ter commit/branch rastreável.
- Canal `preview` é usado pela família. Push na `main` publica automaticamente; desenvolvimento local pode acessar o banco compartilhado configurado no `.env`.
- Não exponha tokens, senhas ou service role. `app_settings` é legível por autenticados e não é cofre de segredos.
- Não edite migrations aplicadas; crie a próxima sequência. O runner usa `public._migrations` e também altera Auth/`.env`.
- Centralize novas queries em `src/lib/repo.ts`; preserve filtros de categoria/temporada.
- Bolões são de F1. Palpites são visíveis aos membros mesmo antes do fechamento. Ranking é SQL; revise também cálculo visual em `PicksBoard`/`Podium` se mudar pontuação.
- Exclusão definitiva só pelo dono, com RLS e confirmação; ranking geral soma bolões existentes de todos os anos (`0017`, RPC `global_standings`). Aplicar a migration antes de publicar o cliente.
- `LIVE_ENABLED` (`EXPO_PUBLIC_LIVE_ENABLED === 'true'`) é false por padrão: Ao vivo desligado não deve iniciar consultas/settings/autenticação/polling do monitor. Fotos na importação F1 são independentes.
- Ao mudar `src/lib/f1api.ts`, atualize a cópia `supabase/functions/_shared/f1api.ts`. Há duplicação F2/F3 no script administrativo.
- Formate programação em Brasília pelos helpers existentes; use `driver_id` para identidade entre temporadas.
- Valide conforme o escopo: TypeScript, exportação web quando afetada, sintaxe de scripts e casos SQL/RLS para regras do backend. Typecheck exclui as Edge Functions.
- `npm test` executa os cenários SQL/RLS isolados em PGlite; não usa `.env` nem produção. Os testes não incluem as extensões cron/net.
- Atualize a documentação correspondente junto das alterações. `PLANO.md` é histórico, não especificação vigente.
- Convenção existente: Conventional Commits em português, um assunto por commit.

- Status de bolão vem de `pool_lifecycles` (`0019`): fechamento de palpites não finaliza. Em andamento antes de Finalizados, criação desc dentro de cada grupo. Testes atuais: 24 (SQL/RLS, HTTP, helpers). Publicações e limites em `docs/VALIDACAO_PRODUCAO.md`.
