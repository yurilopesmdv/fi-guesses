# Bolão F1

App de bolão de Fórmula 1 pra família: palpite de pódio, perguntas extras, ranking, calendário com horários em Brasília, campeonato e monitor ao vivo.

- **App:** Expo (React Native) + TypeScript + expo-router
- **Backend:** Supabase (Postgres, Auth, RLS) — pontuação calculada em SQL
- **Dados:** Jolpica (calendário, resultados, campeonato) e OpenF1 (ao vivo)
- **Distribuição:** APK (Android), Expo Go (iPhone) e web — ver `INSTALACAO.md`

## Rodar

```bash
cp .env.example .env   # preencher URL e anon key do Supabase
npm install
npx expo start
```

## Estrutura

- `src/app` — telas (expo-router)
- `src/components` — pódio, seletor de pilotos, quadro de palpites, ao vivo
- `src/lib` — cliente Supabase, camada de dados, APIs da F1
- `supabase/migrations` — schema, RLS, pontuação
- `scripts` — setup do banco, sync da F1, upload do APK
