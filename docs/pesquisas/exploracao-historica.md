# Exploração histórica da F1 — pesquisa de produto de 30/10/2026

Status: propostas, não implementação autorizada. Pedido atual: ideias e investigação, mantendo o produto existente. Instagram saiu do pipeline. Alertas que afetam palpites, diário do palpite e desafio de corrida histórica continuam excluídos. Nenhuma regra de bolão, navegação ou dado esportivo foi alterado nesta pesquisa.

## Acervo conferido

Consulta somente leitura no Supabase em 30/10/2026, restrita a contagens esportivas, e inspeção de rotas, tipos, importador e migrations 0013–0016/0020–0024. Sem contas temporárias, dados pessoais ou importação. Código de referência: 155b715, documentação posterior 892ff1d.

| Recurso | Evidência | Implicação |
|---|---|---|
| Temporadas F1 | 77 representadas, 1950–2026 | Consultas entre décadas já são possíveis. |
| Corridas | 1.172 no calendário importado; 1.167 com resultados | As contagens por temporada coincidem entre calendário/resultados até 2025. Não substitui auditoria contra fonte nem comprova cada campo. |
| Resultado individual | 26.295 linhas de corrida principal | Não é contagem de pilotos diferentes nem de ultrapassagens. |
| Grid histórico | 26.024 resultados com posição positiva | 271 linhas sem posição positiva precisam ficar como ausentes/boxes, não virar P0. |
| Pilotos | 830 driver_id distintos, 3.141 linhas por temporada, nenhum driver_id nulo | Cruzar por identidade; siglas não são identidade histórica. Todos os resultados auditados encontraram piloto pela temporada/sigla. |
| Pistas | 78 publicadas, todas com coordenadas válidas | Mapa mundial não exige coletar latitude/longitude. Hoje: 23 atuais e 55 históricas, separadas. |
| Ligações | Todas as 1.172 corridas têm circuit_id | Navegação corrida → pista e agregações por pista estão disponíveis. |
| Acervo de vencedores | 1.167 edições e 1.170 registros de vencedores | Há vitórias compartilhadas; não contar linhas como edições. |
| Traçados | 78 referências de layout, 23 com recorde de volta | Não é uma série completa de todas as alterações dos traçados históricos. |
| Horários de classificação | 422 corridas com horário preenchido | Calendário antigo não deve inventar horários de sessões. |

Já existem: lista anual de corridas; programação por GP; grid separado de qualy/chegada; perfis de piloto/equipe, estatísticas de carreira, gráficos por temporada e confronto entre companheiros; pistas com dados, maiores vencedores e atuais/históricas separadas; comparação contextual no palpite, notícias e ferramentas do bolão. As propostas seguintes acrescentam maneiras de explorar esses recursos.

## Referências de outros esportes

| Referência primária | Comportamento observado | Tradução para nosso produto |
|---|---|---|
| [FotMob](https://www.fotmob.com/) | Partidas por horário, entidades seguidas e acesso a notícias/programação | Calendário como porta de entrada, com ligações para GP, pista e bolão. |
| [Sofascore](https://corporate.sofascore.com/about) | Heatmaps, shotmaps e outras visualizações para tornar estatísticas legíveis | Matriz piloto × pista e destaques visuais com amostra, sem copiar um índice opaco de desempenho. |
| [Stathead/Sports Reference](https://info.sports-reference.com/stathead-basketball-getting-started) | Filtros por jogo, temporada, sequência, intervalo e confrontos | Buscador de feitos, melhores sequências e comparação por primeiras N provas. |
| [NBA Stats](https://pr.nba.com/nba-stats-sap/) | Arquivo histórico, gráficos espaciais, comparações e recortes de estatísticas | Consultas que partem de uma pergunta e abrem as corridas que sustentam a resposta. Página é o anúncio histórico de 2013, não um levantamento de todas as funções atuais. |
| [Strava](https://support.strava.com/en-us/articles/15402028-personal-heatmaps) | Mapa com filtros temporais e passagem de ponto/localização a detalhes | Atlas das pistas, filtro por período e mapa de vitórias de um piloto. Não há necessidade de rastrear localização do usuário. |
| [StatMuse](https://developer.statmuse.com/docs/asking-questions/) | Perguntas em linguagem natural retornam resposta e dados estruturados | Começar com perguntas guiadas e filtros, sem depender de IA ou inventar resposta. A API consultada não lista F1; é referência de interação, não fornecedor para nosso acervo. |

Estas são adaptações propostas, não alegações de novidade mundial. Não copiamos dados desses produtos; usamos o acervo F1 existente e as fontes esportivas já integradas.

## Ideias que reaproveitam o acervo

Esforço é relativo a este projeto, incluindo UI, consultas e validação. “Dados atuais” significa sem fornecedor novo; ainda há trabalho de tela, RPC, desempenho e qualidade. Não são estimativas fechadas de prazo.

| # | Proposta | Experiência e cruzamento | Dados/adaptação | Esforço |
|---|---|---|---|---|
| 1 | Calendário visual | Alternar Lista/Agenda/Mês; tocar no dia abre sessões e GP; passado mostra pódio, próximo oferece acesso ao palpite. Navegar entre anos. | races, sessões e vínculo com bolões; sem criar apostas automaticamente. | Baixo–médio |
| 2 | Calendário no celular | Exportar GP ou temporada em arquivo ICS, com identificação estável e horários em Brasília. | Dados atuais. Arquivo é fotografia do calendário; assinatura que acompanha mudanças é outra entrega. | Baixo |
| 3 | Atlas mundial de pistas | Pinos, país e ficha ao tocar; camadas Atuais/Históricas separadas, filtro por temporada e rota esquemática do calendário. | Coordenadas já existem nas 78 pistas. Tipar/expor no cliente. Mapa vetorial simples pode evitar SDK nativo; mapa com ruas/tiles tem custo e operação próprios. | Médio |
| 4 | O mundo de um piloto | Mapa com vitórias/pódios de um piloto por circuito, tamanho do pino e filtro de período. | driver_id + resultados + circuit_id + coordenadas. | Baixo–médio após atlas |
| 5 | Matriz piloto × pista | Linhas de pilotos, colunas de pistas, cor por taxa de pódios/vitórias ou mediana de chegada. Toque revela n provas e lista de resultados. | Dados atuais, denominadores explícitos e mínimo de amostra. | Médio |
| 6 | Largada → chegada | Linhas ligam P de largada a P final em um GP; filtrar piloto/equipe. Vê-se quem ganhou/perdeu posições. | Grid e resultado. Ganho líquido não equivale a ultrapassagens. | Baixo–médio |
| 7 | Como o grid se converteu | Por pista/período: vitórias partindo de P1, pódios vindos de fora do top 3 e mediana da variação de posições. | Dados atuais; variantes do traçado e ausência de grid informadas. P1 não deve ser chamado automaticamente de pole da qualy. | Baixo–médio |
| 8 | Temporada em uma tela | Matriz piloto × etapa; cada célula é resultado com cor de vitória/pódio/abandono. Diferente da faixa de resultados de um único piloto já existente. | Dados atuais. Cabeçalho/nomes fixos e rolagem horizontal no celular. | Médio |
| 9 | Regularidade, não só média | Distribuição de chegadas por piloto, top 5/top 10 e abandonos separados. Identifica consistência que um total de pontos esconde. | Dados atuais; normalizar status e mostrar distribuição/amostra. | Baixo–médio |
| 10 | Encontrar feitos | Perguntas guiadas: vitórias saindo de P10+, pódios em três pistas selecionadas, maiores recuperações. Resultado abre cada corrida. | SQL parametrizado com filtros e paginação; sem IA obrigatória. | Médio |
| 11 | Melhores sequências | Sequência de pódios, resultados em pontos ou vitórias; tocar abre início/fim. Diferenciar participações consecutivas de rodadas consecutivas. | Resultados existentes; respeitar sistemas históricos e falhas de cobertura. | Médio |
| 12 | Carreiras no mesmo ponto | Sobrepor primeiras 25/50/100 corridas de dois pilotos e acompanhar vitórias/pódios acumulados. | Dados atuais; validar largadas versus inscrições/DNS, não contar linhas cegamente. | Médio |
| 13 | Rivalidade por pista | Confronto de dois pilotos nas mesmas provas, mesmo quando correram por equipes diferentes; filtro de circuito/período e abandonos visíveis. | Novo recorte sobre os mesmos resultados; atual head-to-head é entre companheiros. Não atribuir mérito individual isolado do carro. | Baixo–médio |
| 14 | Rede de companheiros | Grafo de pilotos ligados quando compartilham equipe em uma corrida; tocar abre o confronto. “Por quem estas duas carreiras se conectam?” | Dados atuais; car-sharing histórico e trocas no meio da temporada exigem tratamento. | Médio |
| 15 | Carreira visual por equipes | Linha com blocos de temporadas e resultados por passagem, ligados aos perfis existentes. | Equipe real do resultado, não apenas último time registrado no cadastro daquele ano. | Baixo–médio |
| 16 | História da pista no calendário | Faixa 1950–2026 mostrando presenças, interrupções, retornos e edições; tocar no ano abre GP/vencedores. | Resultados/vencedores atuais; anos e quantidade de edições são métricas distintas. | Baixo |
| 17 | Comparar pistas | Dois a quatro circuitos: extensão, curvas, sentido, presença no mundial e padrão de resultados. Usar barras/pontos com unidades claras. | Layouts de referência existentes; ampliar primeiro entre atuais com metadados revisados. Não comparar recordes absolutos entre variantes como se fossem iguais. | Baixo–médio |
| 18 | País como portal | País → circuitos atuais/históricos → edições → vencedores. Painel “a F1 no Brasil”, por exemplo. | País do circuito já disponível. País do piloto é outra dimensão e requer enriquecimento. | Baixo |
| 19 | Recordes naquela época | Escolher uma data/ano e ver líderes em vitórias/pódios até ali; comparar com hoje. | Acumulados por data; não é reconstrução do campeonato oficial. | Baixo–médio |
| 20 | Vencedores em comum | Selecionar duas ou três pistas e ver pilotos que venceram em todas, exclusivos e interseções. | Vencedores históricos com driver_id; não precisa de novo dado. | Baixo |
| 21 | Aniversários da F1 | Dia/mês abre GPs disputados nessa data, primeiras/últimas vitórias e atalhos para seus registros. Integração natural com calendário. | Datas atuais; aniversários pessoais precisam de nascimento. Diferente de repetir a curiosidade diária já existente. | Baixo |
| 22 | Atlas das temporadas | Cartões por década/ano com campeão, distribuição de vencedores e pistas do calendário; escolhe ano e abre a matriz/agenda. | Standings finais e resultados existentes; temporadas em curso devidamente rotuladas. | Baixo–médio |

## Ideias com enriquecimento pequeno ou bem delimitado

| # | Proposta | Dado novo e origem | Experiência / esforço |
|---|---|---|---|
| 23 | Carreira por idade e países dos pilotos | Nascimento/nacionalidade no endpoint [Drivers da Jolpica](https://github.com/jolpica/jolpica-f1/blob/main/docs/endpoints/drivers.md), atualmente não persistidos pelo app | Primeira vitória por idade, comparação até determinada idade e portal por nacionalidade esportiva. Poucos campos, importação paginada e cobertura explícita. Esforço médio. |
| 24 | Corridas com chegadas apertadas | Voltas completadas e tempos/gaps no [Results da Jolpica](https://github.com/jolpica/jolpica-f1/blob/main/docs/endpoints/results.md); importador atual descarta esses campos | Ordenar GPs por diferença entre primeiro/segundo quando houver tempos compatíveis. Tratar vencedor com tempo absoluto, perseguidor com gap, voltas de diferença e campos ausentes. Esforço baixo–médio. |
| 25 | Evolução dentro de uma corrida | Volta, posição e tempo no endpoint [Laps](https://github.com/jolpica/jolpica-f1/blob/main/docs/endpoints/laps.md), documentado desde 1996 | Gráfico de posições por volta com seletor de dois/três pilotos. Carga por GP sob demanda e cache; volume maior que poucos campos. Esforço médio, não primeiro lote. |
| 26 | Estratégias de pneus em provas recentes | Stints/pit de [OpenF1](https://openf1.org/docs/), histórico documentado desde 2023; pitstops [Jolpica](https://github.com/jolpica/jolpica-f1/blob/main/docs/endpoints/pitstops.md) desde 2011 | Barras por composto e momento da troca. Pitstop Jolpica sozinho não fornece toda a estratégia de pneus. Esforço médio, validar prova de cobertura antes de planejar entrega. Não reativar monitor ao vivo. |

Enriquecimentos 23/24 são os mais próximos de “pouco dado novo”. 25/26 são possibilidades viáveis, mas exigem mais volume e modelagem; não devem ser vendidas como tarefas pequenas.

## Cuidados de produto e dados

- “Histórico disponível” não equivale a todos os campos completos desde 1950. Filtros devem mostrar período/amostra e distinguir ausência de zero.
- O importador converte grid zero em null. Não inferir automaticamente boxes, não-participação ou ultrapassagens a partir disso.
- Hoje estatísticas legadas chamadas poles usam grid=1. Novas telas devem usar “largou em P1”; apuração de poles reais pede fonte própria de qualificação e tratamento de regras de cada época.
- Totais e taxas não são comparações neutras entre eras. Quantidade de etapas, pontos, descartes, sprints, bônus e carros compartilhados variam. Preferir vitórias/pódios por prova, amostra e recortes explícitos.
- Reconstituir campeonato rodada a rodada não é somar pontos de resultados em todas as épocas; esse produto exigiria standings por rodada/regras históricas. Ficou fora das primeiras entregas.
- Genealogia de equipes, mudanças precisas de traçado, clima histórico e ultrapassagens por curva pedem dados/curadoria adicionais. Não inferir que nomes de equipes semelhantes são a mesma entidade, nem que coordenadas significam geometria histórica do circuito.
- Todas as propostas são caminhos adicionais. Preservar as abas, telas, regras, perfis e separação atuais/históricas. Não acrescentar dezenas de abas: calendário dentro de Corridas, mapa dentro de Pistas e “Explorar dados” como acesso secundário inicial.
- Mapa do mundo e mapa do traçado são diferentes. O primeiro já tem coordenadas para as 78 sedes; melhorar todos os traçados com hotspots exige curadoria individual, continuando com Interlagos como único mapa já validado para isso.

## Sequência recomendada

1. Calendário visual + exportação ICS e atlas das pistas. Resolvem organização e descoberta com acervo atual.
2. Largada → chegada + matriz piloto × pista + linha histórica de cada pista. Transformam dados em comparações úteis para quem acompanha/aposta.
3. Encontrar feitos + sequências + rivalidades + recordes no tempo. Aprofundam exploração sem fornecedor novo.
4. Nascimento/nacionalidade e tempos/gaps. Enriquecimentos pequenos com grande reaproveitamento.
5. Voltas e pneus sob demanda, somente após prova de cobertura e validação do custo.

Critério transversal: cards curtos, uma visualização principal por tela e detalhes acessíveis ao toque; não voltar ao excesso de texto recém-revisado. Decidir o que implementar é uma etapa posterior a esta pesquisa.
