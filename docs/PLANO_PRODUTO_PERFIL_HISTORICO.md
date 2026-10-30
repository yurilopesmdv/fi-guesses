# Perfil, acompanhamento e exploração histórica — plano para decisão

Data: 30/10/2026. **Status: execução incremental autorizada em 30/10/2026.** Reúne a pesquisa histórica, as ideias adicionais do perfil e as dependências para escolher as próximas entregas. Publicar cada entrega completa separadamente e informar o caminho de teste no chat. Primeiro lote: perfil/indicadores → acompanhamento → resumo do GP → calendário visual; manter as exclusões e as fases posteriores rastreáveis.

A pesquisa-base, auditoria do acervo, 26 propostas e fontes estão em [Exploração histórica](pesquisas/exploracao-historica.md). Instagram foi retirado do pipeline. Permanecem fora: alertas que afetam palpites, diário do palpite e desafio de corrida histórica. Qualy/sprint continuam perguntas opcionais; não criar regras de pontuação ou modos obrigatórios novos.

## Direção de produto

Três jornadas que compartilham os mesmos dados:

1. **Meu perfil:** como estou nos bolões e o que acompanho na F1.
2. **Calendário e pistas:** quando acontece, onde acontece e como explorar cada etapa.
3. **História e comparações:** o que os resultados revelam quando cruzamos piloto, equipe, pista e época.

O perfil vira uma página própria acessada pelo avatar já existente. Começar sem acrescentar sétima aba na barra inferior. Preservar a edição de nome/avatar atual e oferecer o novo acesso a partir dela. Corridas ganha opção Lista/Calendário; Pistas, Lista/Mapa, mantendo Atuais/Históricas separadas. Análises avançadas entram por acesso secundário em F1 e pelos perfis, sem substituir telas existentes.

## Frente pessoal — propostas adicionais

| ID | Módulo | Entrega proposta | Dados / esforço relativo |
|---|---|---|---|
| P01 | Perfil próprio completo | Nome/avatar, resumo curto, acesso a bolões, acompanhamentos e preferências. Preferir três blocos iniciais e expansões. | Cadastro atual + nova rota; baixo–médio. |
| P02 | Indicadores dos bolões | Em andamento/finalizados, total de pontos, posição geral, posição em cada bolão, participação, aproveitamento apurado, vitórias/pódios em bolões concluídos e pódios exatos acertados. Filtro por ano/bolão. | Agregações protegidas sobre dados atuais; médio. |
| P03 | Seu último GP | Resumo curto dos pontos e mudanças de posição nos seus bolões, resultados de pilotos/equipes acompanhados e acesso à próxima etapa. | Dados atuais + favoritos; médio. Separar resultado esportivo de apuração do bolão. |
| P04 | Acompanhar pilotos | Seguir um ou vários pilotos; cartão com resultado do último GP, grid/chegada, posição no campeonato e próxima etapa. Carreira encerrada exibe histórico, sem criar expectativa de nova corrida. | driver_id já estável + tabela de favoritos; baixo–médio. |
| P05 | Acompanhar equipes | Seguir equipes; mostrar posição no campeonato, resultados dos pilotos, pontos e último GP. | Favoritos + constructor_id estável a persistir; médio. Não usar nome livre como identidade permanente. |
| P06 | Coleção de pistas | Favoritas, atalhos no perfil, destaque no mapa e filtro no calendário. | circuit_id existente + favoritos; baixo, após base de acompanhamento. |
| P07 | Notícias para você | Filtro opcional baseado no que acompanha, mantendo feed geral e filtros atuais. | Hoje notícias têm vínculo de circuito; piloto/equipe precisam de tags/relação revisadas. Médio; posterior ao acompanhamento básico. |
| P08 | Conquistas informativas | Primeira vitória em bolão finalizado, pódio exato, sequência de participação e recordes pessoais verificáveis. | Dados atuais; médio. Não dão pontos, prêmio ou vantagem e não usam ranking provisório para conceder título. |
| P09 | Trajetória nos bolões | Linha por temporada com resultados dos bolões existentes e acesso à análise já entregue. Comparar evolução dentro do mesmo bolão/edições comparáveis. | Dados atuais; baixo–médio. Bolão excluído não reaparece por snapshot novo. |
| P10 | Comparação entre participantes | Comparativo visual dentro de um bolão compartilhado, com perguntas/etapas em comum e tamanhos de amostra. | Análises atuais com autorização por bolão; médio, opcional. Não expor bolões privados não compartilhados. |

### Indicadores: regras antes de desenhar números

- Pontos totais e ranking geral mantêm a regra atual: cada bolão existente conta separadamente. Mesmo GP em dois bolões são duas participações nesse indicador; rotular isso claramente.
- Em análises esportivas, contar o GP uma vez. Não somar corridas repetidas em vários bolões como se fossem provas diferentes.
- Aproveitamento é pontos obtidos / pontos possíveis nas perguntas apuradas da amostra; participação usa perguntas elegíveis e palpites confirmados. Não misturar rascunhos, perguntas futuras e respostas rejeitadas.
- “Campeão do bolão” exige pool_lifecycles finalizado. Fechamento de palpites não é finalização. Respeitar empates compartilhados, inclusive na vitrine de troféus.
- Comparações entre bolões com pontuação/perguntas diferentes pedem denominador explícito. Total bruto não será apresentado como uma medida universal de habilidade.
- Para melhor pista/etapa pessoal, oferecer recorte por bolão/ano; resultados do mesmo GP em bolões diferentes não podem ser fundidos arbitrariamente.
- Dados privados do perfil/favoritos ficam privados por padrão. Perfil detalhado de outro participante começa somente no contexto de bolão compartilhado. Ranking geral continua exibindo apenas o que já exibe.

### Como atualizar a cada GP

Acompanhar não exige notificações ou monitor ao vivo. O resultado entra pela sincronização esportiva existente; a apuração entra pelos resultados do bolão. A página busca o estado mais recente ao abrir, ao voltar para ela e ao atualizar manualmente. Com a página aberta, revalidar em primeiro plano de forma limitada ou reagir à mudança de versão da sincronização, após prova técnica.

Mostrar data/estado: aguardando resultado, resultado publicado, apuração parcial/concluída e dados mantidos se houver falha. Não prometer atualização instantânea ao cruzar a bandeirada. Não rodar coleta por usuário: resumos esportivos podem ser compartilhados por entidade/temporada, enquanto pontos de bolão continuam protegidos por usuário/membros. Nenhum alerta de palpite ou push entra por consequência de seguir alguém.

## Frente calendário e pistas

Mantém os IDs da pesquisa, para não perder propostas.

| IDs | Módulo / experiência | Dependência e aceitação |
|---|---|---|
| H01 | Calendário visual: Lista/Agenda/Mês, sessões, passado/próxima etapa e acesso ao palpite | races e horários existentes; datas históricas sem horários inventados. Não criar bolão/pergunta automaticamente. |
| H02 | Exportar GP ou temporada para calendário do telefone | Arquivo ICS com UID estável; deixar claro que exportação simples não é assinatura que acompanha mudanças. |
| H03 | Atlas mundial: pinos, país, filtros de ano e camadas atuais/históricas | 78 coordenadas já presentes. Mapa esquemático primeiro; validar opção compatível com APK antes de escolher biblioteca de ruas/tiles ou exigir binário. |
| H04 | Mapa das vitórias/pódios de um piloto | Depende do atlas; tocar no pino abre provas que sustentam a contagem. |
| H16 | Linha histórica de uma pista no calendário | Presenças, interrupções, retornos e edições. Ano com dois GPs é um ano e duas edições. |
| H17 | Comparar circuitos | Comprimento, curvas, sentido e estatísticas; dados de layout de referência, sem supor geometria invariável por décadas. |
| H18 | País como portal | País → pistas → edições/vencedores. Nacionalidade do piloto depende de enriquecimento separado. |
| H21 | Aniversários esportivos no calendário | GPs/feitos em determinada data; diferente da curiosidade diária atual. |
| H22 | Atlas de temporadas e décadas | Selecionar ano revela campeão, distribuição de vencedores e pistas; conecta à agenda e à matriz. |

No mapa mundial, agrupar pinos próximos, abrir ficha em painel inferior no celular e manter lista acessível equivalente. O calendário preserva os filtros de categoria da rota existente, mesmo se a primeira visão nova começar por F1.

Mapa mundial e mapa do traçado são produtos diferentes. O primeiro tem coordenadas prontas; ampliar hotspots do segundo continua dependendo de curadoria, com Interlagos como o traçado já validado. Não buscar novas fotos para preencher todas as pistas sem curadoria oficial F1.

## Frente histórico e cruzamentos

| IDs | Módulo / experiência | Dados / esforço relativo |
|---|---|---|
| H05 | Matriz piloto × pista: cores por vitórias/pódios/mediana, com amostra e acesso às provas | Atual; médio. |
| H06 | Largada → chegada: linhas por piloto/equipe no GP | Atual; baixo–médio. Ganho líquido não é número de ultrapassagens. |
| H07 | Conversão do grid por pista/período | Atual; baixo–médio. “Largou em P1” não é necessariamente pole da qualy. |
| H08 | Temporada em uma tela: pilotos × etapas | Atual; médio. Diferente da faixa de um único piloto já existente. |
| H09 | Regularidade: distribuição de chegadas e abandonos separados | Atual; baixo–médio, com status/cobertura validados. |
| H10 | Encontrar feitos por perguntas/filtros guiados | Atual; médio. Ex.: vitórias saindo de P10+, resultado abre provas. Sem IA obrigatória. |
| H11 | Melhores sequências | Atual; médio, distinguindo participações de rodadas consecutivas. |
| H12 | Carreiras nas primeiras 25/50/100 corridas | Atual; médio, após validar largadas versus inscrições/DNS. |
| H13 | Rivalidade por pista, incluindo equipes diferentes | Atual; baixo–médio. Novo recorte, preservando confronto entre companheiros existente. |
| H14 | Rede de companheiros e conexões entre gerações | Atual; médio, com exceções de carros compartilhados e trocas no ano. |
| H15 | Carreira visual por passagem em equipe | Atual; baixo–médio; equipe do resultado, não apenas cadastro anual. |
| H19 | Recordes até determinada data | Atual; baixo–médio. Não confundir com reconstrução de campeonato oficial. |
| H20 | Vencedores em comum entre circuitos | Atual; baixo. Interseções e exclusivos com ligação para resultados. |

## Enriquecimentos e possibilidades posteriores

| IDs | Proposta | Dado / limite |
|---|---|---|
| H23 | Carreira por idade e países de pilotos | Nascimento/nacionalidade Jolpica, não persistidos hoje. Poucos campos, esforço médio. |
| H24 | Corridas decididas por pequenas diferenças | Voltas e tempos/gaps de resultados Jolpica. Esforço baixo–médio; ausência/volta de diferença não vira gap numérico falso. |
| H25 | Evolução de posições dentro de uma corrida | Laps Jolpica, documentação desde 1996. Mais volume; esforço médio e carga por GP sob demanda. |
| H26 | Barras de estratégias de pneus | OpenF1 histórico desde 2023 e pitstops Jolpica desde 2011; médio e prova de cobertura. Não reativa Ao vivo. |

Não priorizar agora: reconstrução oficial de todos os campeonatos rodada a rodada (descartes, meio ponto, sprints e regras por época); genealogia automática de equipes; replay GPS universal desde 1950; clima histórico de todas as provas; previsão opaca de vitória. Essas propostas exigem investigação/dados maiores que o reaproveitamento pedido.

## Fases para escolher

| Fase candidata | Conteúdo | Valor e dependências |
|---|---|---|
| A — Meu perfil e acompanhamento | P01–P06; indicadores essenciais primeiro, resumo de último GP, seguir pilotos/equipes e favoritas | Motivo para retornar a cada GP. Exige base privada de favoritos e identidade estável de equipes. Não incluir todas as métricas no primeiro viewport. |
| B — Calendário e atlas | H01–H04, H16, H18; H02 como exportação simples | Organização e descoberta visual, conectadas aos acompanhamentos e perfis existentes. |
| C — Comparação visual | H05–H09, H13, H15, H17, H20 | Aproveita o acervo com novas leituras, sem fornecedor novo. |
| D — Exploração histórica | H10–H12, H14, H19, H21–H22 | Feitos, sequências, conexões e descoberta por época. |
| E — Camada pessoal complementar | P07–P10 | Personalização de notícias precisa de tags; conquistas e comparativos pedem regras/amostras/privacidade claras. |
| F — Enriquecimentos | H23–H26 | Começar pelos pequenos campos de nascimento/nacionalidade e tempos; voltas/pneus depois de prova técnica. |

Recomendação para a primeira seleção: **perfil + indicadores essenciais + acompanhar pilotos/equipes + calendário visual**. Atlas pode vir logo em seguida ou dividir a primeira entrega se a prioridade for exploração geográfica. Não é compromisso de prazo; após a seleção, detalhar tarefas e esforço com base nos módulos escolhidos.

## Bases técnicas para implementação posterior

- Favoritos com user_id e identidade de entidade, unicidade para impedir duplicatas, RLS de leitura/escrita só do dono e remoção independente de histórico esportivo. Seguir entidade não muda visibilidade dos palpites.
- Persistir constructor_id da fonte para equipes. Não transformar renomeações/fusões históricas em uma única entidade sem decisão editorial. Identidades de pilotos/circuitos existentes continuam usadas.
- Novas métricas via repo.ts/RPC com filtros por usuário/membro, categoria F1, temporada e contexto de bolão. Agregações e paginação no servidor; não baixar 26 mil resultados para cada telefone.
- Migrations novas, sem alterar aplicadas. Backend/RLS antes do cliente. Preservar exclusão definitiva, empates, ranking e status de pool_lifecycles.
- Primeira opção visual usa componentes/dependências existentes. Qualquer mapa que peça novo módulo nativo deve ser tratado como decisão de distribuição, não uma OTA garantida.
- Estados vazios/erro/atualização/cobertura; 360/390 px, fonte maior, alvos de toque e acessibilidade. Perfil com números e cartões curtos, sem repetir excesso de explicações.
- Validar testes relevantes de cálculo/RLS, TypeScript, web, compatibilidade SDK 57 e jornadas em iPhone/Android. Não anunciar teste físico antes de realizá-lo.

## Critérios para a decisão de produto

Escolher o primeiro lote pelos três eixos: retorno a cada GP (perfil/acompanhamento/calendário), utilidade para analisar palpites (matrizes/grid/rivalidades) e descoberta de história (mapa/feitos/linha temporal). Cada módulo pode ser entregue separadamente e continua opcional para quem só quer entrar no bolão e palpitar.


## Execução incremental

- P01/P02: perfil e indicadores publicados e conferidos; migration 0032 aplicada. Código 2ff5ca8, port SDK 57 76c1219. Testar: Bolões → avatar no canto superior direito → Meu perfil.
- P04/P05/P06: publicado (a14e5f6, migration 0033 aplicada; 205 equipes com constructor_id). Testar: página de piloto/equipe/pista → Seguir → Meu perfil → Acompanhando.
- P03: cartão “Seu último GP” no perfil (migration 0034): pontos no GP, posição antes→depois em cada bolão e estado da apuração. Testar: Meu perfil → topo.
- H01/H02: Corridas com Lista/Mês e exportação .ics (web; arquivo simples, sem assinatura). Testar: aba Corridas → Mês / 📅 .ics.
- H03/H18: Pistas com Lista/Mapa: mapa-base estático no tema (Natural Earth 50m, domínio público, scripts/gen-world-map.mjs → assets/images/world-map.png), atalhos Mundo/Europa/Américas/Ásia e Oceania, pinos agrupados conforme o zoom, painel com as pistas; respeita Atuais/Históricas, busca e país; lista equivalente mantida. Sem módulo nativo. Testar: aba Pistas → Mapa.
- H04: perfil do piloto → “Vitórias e pódios pelo mundo” (carrega ao abrir; pino lista as provas). Migration 0035.
- H05/H07: “Raio-X da pista” na corrida (pública e do bolão): conversão do grid, vitória mais de trás, ganho médio e retrospecto do grid atual na pista, só com GPs anteriores. Migration 0036.
- H15/H11: piloto → “Trajetória”: passagens por equipe (equipe do resultado) em linha do tempo e melhores sequências de vitórias/pódios/pontos em largadas consecutivas. Migration 0037. H09 já coberto pela distribuição de resultados existente.
- H06: classificação com ganho/perda por piloto (▲/▼), destaques (mais subiu, mais caiu, abandonos) e status em português. Ganho líquido, não ultrapassagens.
- H17/H20: pista → “Comparar pista”: ficha lado a lado (traçado de referência, GPs, estreia, vencedores diferentes) e pilotos que venceram nas duas. Migration 0038.
- H13: comparar pilotos → “Em todos os GPs em comum · por pista” (qualquer equipe), mantendo o confronto entre companheiros. Migration 0039.
- H10: F1 → “Explorar a história”: seis perguntas guiadas (vitórias de P10+, P1 sem pontos, primeiras vitórias, maior espera, vitória na estreia, dobradinhas) com filtro de época; até 100 linhas do servidor. Migration 0040.
- H22/H08: F1 → “Temporada {ano} em uma tela”: campeões (só com temporada encerrada) ou líder, vencedores, % de vitórias de P1 e etapas no mapa; navegação entre anos. Migration 0041.
- H12: comparar pilotos → “Primeiras largadas” 25/50/100 (exclui Withdrew/Did not start). Migration 0042.
- H21: Corridas (ano atual, F1) → “Neste dia na F1”: GPs na mesma data em Brasília (±3 dias) com vencedor. Migration 0043.
- H19: Explorar a história → “Recordes até {ano}”: top 5 de vitórias, pódios, largadas e P1 no grid até o fim do ano escolhido. Migration 0044.
- H14: piloto → “Companheiros de equipe”: cartões roláveis com confronto no mesmo GP/equipe; tocar navega pela rede. Migration 0045.
- P08: Meu perfil → “Conquistas”: campeão e pódio (só finalizados, empates contam), pódio exato, presença completa e veterano; informativas, sem pontos. Sem migration.
- P09: Meu perfil → “Sua trajetória”: por temporada, número de bolões, melhor posição, títulos e aproveitamento apurado. Sem migration.
- P10: análise do bolão → “Comparar com”: membro do mesmo bolão, só perguntas apuradas respondidas pelos dois (pontos, etapas, pódios exatos) e amostra exibida. Sem migration; usa a autorização existente de pool_analysis.
- P07: Notícias → filtro “Para você”: pistas seguidas (vínculo) e menções por palavra inteira ao sobrenome do piloto/nome da equipe seguidos. Migration 0046. Feed geral inalterado.
- Próximos: fase F (H24 corridas apertadas, H23 idade/nacionalidade).

### Plano detalhado do restante (30/10/2026)

Base: `main` em SDK 58. Cada entrega: migration nova (backend antes do cliente) → `repo.ts`/`types.ts` → tela → testes SQL/RLS em `tests/pools.test.mjs` → `npm run typecheck`, `npm test`, `npx expo export --platform web` → commit/push somente com autorização.

| Entrega | Escopo | Backend | Cliente | Aceitação |
|---|---|---|---|---|
| 2 — Acompanhar (P04/P05/P06) | Seguir pilotos, equipes e pistas; cartões no perfil | 0033: `constructor_id` em `drivers`, `race_results`, `constructor_standings` (fonte Jolpica + backfill/trigger pela normalização atual); tabela `follows` (dono, tipo, entidade, PK única, RLS só do dono, limite por usuário, validação da entidade); RPC `my_follows_overview()` | Botão Seguir no piloto, equipe e pista; seção “Acompanhando” no perfil com último GP, grid→chegada, campeonato, próxima etapa (só se ativo) | Outro usuário não vê/edita favoritos; anônimo bloqueado; carreira encerrada sem próxima etapa; renomear equipe não quebra identidade |
| 3 — Seu último GP (P03) | Último GP F1 com resultado: pontos por bolão, mudança de posição, resultados dos acompanhados | RPC `my_last_gp_summary()` com posição antes/depois por bolão, estados aguardando/parcial/apurado | Cartão no topo do perfil e acesso à próxima etapa | Resultado esportivo separado da apuração; bolão sem pergunta no GP não aparece |
| 4 — Calendário visual (H01 + H02) | Corridas: Lista/Mês; sessões; próxima etapa; atalho para palpitar; exportar `.ics` | Sem migration | Alternância em `(tabs)/races.tsx`; grade mensal em Brasília; ICS com UID estável (web: download; app: compartilhar texto) | Datas históricas sem horário inventado; não cria bolão/pergunta |
| 5 — Atlas (H03/H04/H18) | Mapa esquemático (equirretangular, SVG/Views existentes) com pinos atuais/históricos; país como portal; vitórias de piloto no mapa | RPC leve de coordenadas + contagens | Pistas: Lista/Mapa; painel inferior ao tocar | Sem dependência nativa nova |
| 6 — Comparação visual (Fase C) | H05, H06, H07, H09, H13, H15, H20 | RPCs agregadas por piloto/pista/período | Acesso secundário em F1/perfis | Amostras exibidas; paginação no servidor |
| 7+ — Fases D/E/F | Exploração, P07–P10, enriquecimentos | Conforme seções acima | — | Exigem decisões de produto antes |

Decisão de identidade de equipe (P05): hoje `team` é o nome derivado do `constructorId` por `TEAM_NAMES`. A 0033 persiste o `constructor_id` vindo da fonte e preenche linhas existentes pela inversa determinística dessa tabela; o trigger cobre clientes antigos que ainda não enviam a coluna. Favorito de equipe guarda `constructor_id`, nunca o nome. Fusões/renomeações históricas continuam entidades separadas.
