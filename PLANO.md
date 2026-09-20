# Bolão F1 — Plano de implementação

Projeto paralelo (família). 2 iPhones + 3 Androids. Sem App Store / Play Store.

## 1. Decisões de stack

| Camada | Escolha | Por quê |
|---|---|---|
| App | **Expo (React Native) + TypeScript + expo-router** | Um código pra iOS e Android; build na nuvem (EAS) — não precisa de Xcode/Android SDK aqui. |
| Backend | **Supabase (Postgres + Auth + RLS)** | Free tier, zero servidor pra manter, regras de pontuação em SQL (view), sem N+1. |
| Dados da F1 | **Jolpica API** (`api.jolpi.ca/ergast/f1`, sucessora da Ergast) | Calendário, pilotos e resultados de corrida grátis. Fallback: o organizador digita o resultado. |
| Atualizações | **EAS Update** | Correções de JS chegam nos 5 celulares sem reinstalar nada. |
| Login | E-mail + senha, sem confirmação de e-mail | O SMTP padrão do Supabase só entrega pra membros da org; assim não precisa de e-mail nenhum e a identidade sobrevive a troca de celular. |

### Como cada celular recebe o app (o ponto crítico)

- **Android (3):** `eas build -p android --profile preview` gera um **APK**. EAS dá link + QR; manda no WhatsApp, o celular instala. Sem custo.
- **iPhone (2):** o iOS **não aceita instalar .ipa "por arquivo"** sem conta Apple Developer. Opções:
  - **A. Expo Go (grátis, hoje):** instala o app "Expo Go" da App Store e abre o bolão por QR/link. Funciona igual, mas roda "dentro" do Expo Go (ícone é o do Expo Go).
  - **B. Apple Developer (US$ 99/ano):** build Ad Hoc com o UDID dos 2 iPhones → instala por link, ícone próprio na tela. Aprovação da conta pode levar 1–2 dias.
  - **C. Sideload (AltStore):** grátis mas expira a cada 7 dias e precisa de PC com AltServer. Não recomendo.
  - **Plano B sem custo e sem Expo Go:** o mesmo código Expo exporta pra **web** (PWA) hospedada de graça (Vercel); no iPhone "Adicionar à Tela de Início" vira ícone próprio.

**Recomendação:** Android = APK; iPhone = **Expo Go agora** (A). Se a família curtir, migra pra (B) depois sem mudar código.

## 2. Modelo de dados (Supabase / Postgres)

```
profiles        id (= auth.uid), name, avatar_emoji
pools           id, name, invite_code (6 chars), owner_id, season, stake_label ("R$ 5 simbólico"), lock_minutes_before (default 0 = na largada)
pool_members    pool_id, user_id, joined_at            PK (pool_id, user_id)
races           id, season, round, name, circuit, country, date_utc, status (upcoming|finished), source (api|manual)
drivers         id (code: VER, NOR...), season, name, number, team, team_color
questions       id, pool_id, race_id, kind, prompt, points, near_points, position (ordem), created_by
                kind: podium | driver | position_of_driver | yesno | text
predictions     id, question_id, user_id, answer jsonb, updated_at   UNIQUE (question_id, user_id)
results         question_id (PK), answer jsonb, set_by, set_at
```

- Toda corrida de um bolão recebe **1 pergunta `podium`** automaticamente (3 slots).
- Perguntas personalizadas ("Em que lugar chega o Russell?") são `position_of_driver` (resposta = número) ou `driver` (resposta = piloto), `yesno`, `text`.
- `answer` jsonb: podium `{"p1":"VER","p2":"NOR","p3":"LEC"}`; driver `{"driver":"RUS"}`; position `{"pos":5}`; yesno `{"v":true}`; text `{"t":"..."}`.

### Pontuação (função SQL, não loop no app)

```sql
score(kind, prediction, result):
  podium              → por slot: piloto certo na posição certa = 3; piloto no pódio mas posição errada = 1 (máx 9)
  driver / yesno      → igual = points
  position_of_driver  → igual = points; ±1 = near_points (organizador escolhe, default 0)
  text                → organizador marca "acertou" manualmente (results.answer = {"correct_users":[...]})
```

Views: `race_scores(pool_id, race_id, user_id, points)` e `pool_standings(pool_id, user_id, total, races_played)`. Tudo indexado por `(pool_id, race_id)`.

### RLS (segurança sem backend)

- Membro só lê dados dos bolões em que está.
- Palpite: só o próprio usuário, e só enquanto `now() < race.date_utc - lock_minutes`.
- Palpites dos outros só ficam visíveis **depois do fechamento** (ninguém copia).
- `questions` e `results`: só o `owner_id` do bolão.

## 3. Telas e UX

1. **Entrar** — e-mail + senha (cadastro pede nome); depois escolhe emoji de avatar.
2. **Início** — meus bolões; botões "Criar bolão" e "Entrar com código". Código de 6 letras compartilhável no WhatsApp.
3. **Bolão (abas):**
   - **Próxima corrida** — cabeçalho com GP, bandeira, contagem regressiva pro fechamento. Três slots grandes 🥇🥈🥉; toca no slot → bottom sheet com lista de pilotos (cor do time, número, busca por texto). Abaixo, as perguntas extras. Auto-salva; badge "Palpite salvo ✓". Depois de fechar: vira "Tabela de palpites" (participantes × perguntas).
   - **Classificação** — total da temporada, setas ▲▼ vs corrida anterior, toque abre o detalhe por corrida.
   - **Corridas** — lista da temporada com status (aberta / fechada / apurada) e seus pontos em cada.
   - **Participantes** — quem está, quem ainda não palpitou nesta corrida (⚠️), pote simbólico ("5 × R$ 5 = R$ 25").
4. **Painel do organizador** (só owner) — adicionar pergunta extra, botão **"Importar resultado da API"** (Jolpica) com pré-visualização antes de confirmar, ou preencher à mão. Ao salvar, a pontuação já aparece pra todos.

### Melhorias sugeridas (baratas, valem muito)
- Palpites escondidos até o fechamento (anti-cópia).
- Perguntas-bônus prontas em 1 toque: pole, volta mais rápida, "quantos abandonos", "1º a abandonar".
- Desempate configurável (mais pódios exatos > mais acertos).
- Compartilhar classificação como imagem no WhatsApp.
- Lembrete push "faltam 2h pra fechar" (fase posterior — Android e Expo Go suportam; iPhone standalone só com conta Apple).
- Sprint: fim de semana com sprint ganha pergunta de pódio do sprint (opcional).

## 4. Fases de execução

- **F0 Setup** — projeto Supabase (free), `create-expo-app`, conta EAS, `.env` com URL/anon key. Decidir rota do iPhone.
- **F1 Banco** — migrations SQL (tabelas, RLS, função `score`, views). Entrego o SQL pronto pra rodar no SQL Editor.
- **F2 Auth + bolões** — OTP, perfil, criar/entrar por código, participantes.
- **F3 Corridas e palpites** — importar calendário + pilotos (Jolpica), tela de pódio com picker, auto-save, lock por horário.
- **F4 Perguntas extras + apuração** — CRUD de perguntas, painel do organizador, importar resultado, classificação, tabela de palpites.
- **F5 Distribuição** — APK Android + Expo Go/iOS, guia de instalação passo a passo por aparelho, `eas update` configurado.
- **F6 Depois** — push, imagem pra WhatsApp, sprint, desempate.

Ordem de entrega: F1 → F2 → F3 já dá pra instalar e brincar (pódio só); F4 completa; F5 fecha o primeiro fim de semana de GP.

## 5. Guia de instalação (resumo — detalhado na F5)

**Android:** abrir o link do APK no celular → "Permitir instalar apps desta fonte" → Instalar. Atualizações futuras chegam sozinhas (EAS Update); só reinstala APK se mudar algo nativo.

**iPhone (Expo Go):** App Store → "Expo Go" → abrir a câmera no QR que eu gerar → abre o bolão. Pode pedir login numa conta Expo — crio uma conta da família.

**iPhone (Apple Developer, se optar):** cada iPhone abre um link do EAS que registra o UDID → gero o build → link de instalação → Ajustes > Geral > VPN e Gerenciamento de Dispositivo > Confiar.

## 6. Custo
Supabase free + EAS free (limite de builds/mês suficiente) + Jolpica grátis = **R$ 0**. Único custo opcional: Apple Developer US$ 99/ano.
