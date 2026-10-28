# Plano de Pistas e Notícias

Pesquisa em **28/10/2026**, America/Sao_Paulo. **Pistas atuais implementadas e publicadas; evidências em VALIDACAO_PRODUCAO.md.** O levantamento abaixo preserva as decisões e a pesquisa inicial. Históricas e Notícias continuam como etapas seguintes.

## Decisões confirmadas

- **Pistas terá uma aba própria.** Navegação prevista: Bolões, Ranking, Corridas, F1, Pistas e Notícias. Notícias substituirá Ao vivo, mantendo seis destinos, sem abrir uma sétima aba.
- **Primeira entrega: pistas atuais completas.** Pistas fora do calendário entram em uma segunda entrega.
- **Notícias em português**, com resumo curto, identificação da fonte e link para a publicação original.
- A coleta, seleção, preparação e inserção das imagens serão feitas por nós. O usuário **não precisa fornecer imagens nem cadastrar o catálogo**.
- Prioridade de execução: Pistas atuais → pistas históricas → Notícias. A preparação do coletor de notícias pode ocorrer depois da primeira entrega, sem atrasar Pistas.

## O que a pesquisa confirmou

| Verificação | Evidência e consequência para o projeto |
|---|---|
| Calendário atual | F1 e Jolpica retornaram **23 etapas/pistas** na consulta. A primeira entrega acompanha o calendário vigente, sem fixar 24 no código. Testes de pré-temporada não viram pistas adicionais. |
| Identidade histórica | O catálogo Jolpica retornou **78 IDs de circuitos**. É uma base para a segunda entrega, ainda sujeita a conciliação de nomes, sedes e versões de traçado. |
| Imagens oficiais | Baixados e medidos **46 arquivos**, uma capa e um mapa por pista atual. As 23 capas e mapas foram examinados em pranchas de contato. São amostras de pesquisa, não um acervo aprovado para publicação. |
| Qualidade fotográfica | 22 capas medem 1920×1080; a de Madrid, 3392×1908. **14 das 23 foram rejeitadas como capa de pista**, apesar da resolução: foco em piloto, torcida, cerimônia, carro em detalhe ou edifício. As outras nove são candidatas, ainda sem liberação de reutilização confirmada. |
| Mapas oficiais | As versões de exibição medem 1252×704 e incluem curvas numeradas. Originais examinados: Interlagos e Madrid 1920×1080; Silverstone 3840×2160. Portanto, não basta salvar o thumbnail e ampliá-lo. |
| Fontes alternativas | **132 candidatos fotográficos Wikimedia**, distribuídos pelas 23 pistas, com URL, dimensões, autor e licença declarada. Ainda não são a seleção final: há carros em detalhe, fotografias de outras categorias, imagens antigas e arquivos de radar/satélite a excluir. |
| Estatística histórica | A consulta de vencedores de Interlagos retornou 42 edições/temporadas entre 1973 e 2025. Contar `ano atual − estreia + 1` produziria um número incorreto. Monza e Madrid também foram conferidos. |
| Feed em português | RSS F1 do Motorsport retornou 49 itens; RSS F1 do Grande Prêmio, 10. Ambos têm descrição. O endereço antigo `grandepremio.com.br/feed/` redireciona para HTML; o feed atual específico é `grandepremio.com/br/f1/feed/`. |
| RSS oficial F1 | Funciona tecnicamente, mas seus termos restringem agregação e tradução. Não será a base do agregador proposto. |
| Código atual | Há `expo-image`, gestos e Reanimated instalados. Existe cron Supabase para sincronização esportiva, mas **não existe catálogo relacional de pistas, vínculo estável de corrida com circuito ou coletor de notícias**. `races.circuit` é apenas texto. |

O inventário por pista está em [pistas-2026-fontes-imagens.json](pesquisas/pistas-2026-fontes-imagens.json). Contém fontes, medidas, revisão inicial e candidatos; nenhum item tem aprovação automática para publicação. O levantamento de feeds está em [noticias-fontes-2026-10-28.json](pesquisas/noticias-fontes-2026-10-28.json).

## Experiência de Pistas

### Catálogo

A primeira tela apresenta “Pistas da temporada”, com destaque para a próxima pista, busca por nome/país/cidade e lista virtualizada de cartões. Cada cartão reúne foto real da pista, nome, localização e miniatura do traçado. Evitar uma parede de imagens carregadas de uma vez.

A pista também será acessível pelo detalhe do GP e pelo bolão: tocar no nome do circuito abre o mesmo perfil, com retorno ao contexto de origem. Isso torna a consulta útil antes de palpitar, sem obrigar a pessoa a sair do app ou perder o formulário.

Com seis abas, usar rótulos curtos e validar navegação em 360, 375 e 390 pontos, fonte ampliada e áreas de toque de pelo menos 44 pontos. Seis ícones cabem tecnicamente; a aprovação visual precisa verificar legibilidade e não apenas compilação.

### Perfil de pista

Ordem sugerida para o celular:

1. **Capa e identidade:** nome mais conhecido, nome oficial, cidade/país e status na temporada selecionada.
2. **Resumo:** extensão do traçado atual, número de curvas, sentido, estreia no Mundial, temporadas disputadas e total de GPs.
3. **Traçado:** mapa completo, sem cortes, com curvas numeradas, largada e sentido. Abrir em tela cheia, ampliar com dois dedos e arrastar. Legenda/lista de curvas conhecidas abaixo; nomes ausentes não serão inventados. Identificar ano/versão do mapa.
4. **Último GP disputado nesta pista:** data, vencedor e equipe, com acesso ao resultado completo existente. Usar a última corrida com resultado confirmado, não apenas a última data do calendário. Pista sem estreia deve mostrar esse estado.
5. **Mais vitoriosos:** cinco pilotos, quantidade de vitórias, empates preservados e acesso ao perfil existente. Escopo padrão: história do Mundial na pista, não apenas pilotos atuais.
6. **Galeria:** meta de quatro fotos distintas por pista, incluindo a capa: vista geral/aérea, trecho característico, reta/boxes e ambiente. Gestos de navegação, contador, legenda, data quando conhecida e créditos acessíveis.
7. **História e contexto:** texto curto em português, fundamentado, com curiosidades verificadas e fontes. Características como tipo de pista e trechos marcantes podem ajudar no palpite; previsões ou afirmações sobre ultrapassagem/clima não serão inventadas.

A meta da primeira entrega é **cada pista atual com os blocos completos**, não lançar todas com galerias vazias e chamar isso de catálogo pronto. A cobertura fotográfica exige curadoria além dos candidatos já encontrados.

### Segunda entrega: históricas

Acrescentar filtro “No calendário / Fora do calendário / Todas”, mantendo a identidade por circuito. “Fora do calendário” significa fora da temporada F1 escolhida, e não circuito fechado ou abandonado.

Cada pista histórica terá a mesma estrutura. Onde não houver fotografia recente adequada, utilizar fotografia histórica identificada com seu período, sem apresentá-la como atual. Separar mudanças de traçado e não juntar circuitos distintos por terem recebido o mesmo nome de GP. Fases posteriores podem mostrar a evolução de layouts; a primeira versão histórica deve ao menos indicar a versão exibida.

## Imagens: aquisição e padrão de qualidade

### Fontes e seleção

- **Dados e referência técnica:** páginas da F1, documentos FIA e sites oficiais dos autódromos/promotores. Suzuka, por exemplo, publica guia de curso e distingue traçado de carros do de motos; usar o de F1.
- **Arquivos publicados no app:** priorizar material com reutilização explicitamente permitida. Para cada arquivo, guardar autor, origem, licença, link da licença, data/versão e eventuais alterações realizadas. Commons permite verificar essa informação por arquivo; encontrar uma imagem no site oficial não equivale a permissão para redistribuí-la.
- **Quando o material oficial não estiver liberado:** selecionar equivalente de acervo licenciado. Para mapa, uma base vetorial licenciada pode ser preparada e exportada com padrão visual comum, conferindo curvas/versão nas referências oficiais e cumprindo a licença.
- Evitar hotlinks de terceiros como armazenamento definitivo. Os arquivos aprovados e suas variantes ficam no Storage do projeto, com URLs versionadas. Downloads desta pesquisa permanecem temporários e não foram enviados ao Storage.

A seleção é semântica e visual, além da resolução: mostrar a pista correta; evitar imagens genéricas de carro, torcida ou prédio; verificar mudanças de layout; preservar legibilidade das curvas. Uma foto de 4000 px sem relação visual com o circuito será rejeitada. Uma imagem aérea de radar em TIFF não vira foto de capa apenas por ser grande.

### Variantes previstas

| Uso | Alvo inicial de preparação | Exibição |
|---|---|---|
| Cartão | 480–640 px, WebP, idealmente até 80 KB | Corte controlado com ponto focal registrado |
| Capa | 1280–1600 px, WebP, idealmente até 200 KB | Proporção consistente; sem texto essencial dentro da foto |
| Galeria ampliada | 1920–2560 px, WebP/JPEG, idealmente até 500 KB | Original otimizado sob demanda; preservar composição |
| Traçado | PNG/WebP de alta resolução ou exportação de SVG licenciado | `contain`, sem recortar, zoom; preservar números e legendas |

São **orçamentos de implementação**, não medições de desempenho já obtidas. Não ampliar artificialmente uma imagem pequena para atingir a resolução-alvo. Se o mapa não suportar zoom legível, obter uma fonte melhor ou preparar uma exportação maior a partir do vetor.

Usar `expo-image`, placeholders discretos, cache de disco/memória e carregamento das fotos visíveis. Pré-carregar no máximo a próxima imagem da galeria; não baixar todas as originais ao abrir o catálogo. Fotos e mapa precisam de texto alternativo, estado de erro e botão de nova tentativa.

Preparar tamanhos antecipadamente no processo de importação. Isso evita depender de Image Transformations do Supabase, atualmente documentado para plano Pro ou superior. O plano contratado não foi consultado nesta pesquisa; não assumir upgrade nem custo adicional aprovado.

## Dados e backend de Pistas

### Estrutura proposta

| Entidade | Responsabilidade |
|---|---|
| `circuits` | Identidade estável, ID da fonte, nomes/aliases básicos, localização e URL oficial |
| `circuit_seasons` | Presença no calendário por ano e ligação com etapas; status não fica preso em um booleano eterno |
| `circuit_layouts` | Período/versão, extensão, número de curvas, sentido, mapa e fonte técnica |
| `circuit_media` | Arquivo, variantes, capa/galeria/mapa, ordem, autor/licença, legenda, dimensões, ponto focal e estado de aprovação |
| `circuit_race_winners` | Edições e vencedores históricos, identificados por `driver_id`; base completa para as estatísticas |
| `circuit_sync_runs` | Fonte, resultado, cobertura, última sincronização e falhas |
| `races.circuit_id` | Ligação das corridas existentes ao circuito; preservar o texto atual durante a transição |

Nomes exatos e distribuição das tabelas podem ser simplificados ao implementar. É necessário preservar a separação entre **local**, **layout**, **temporada** e **material de mídia**.

### Regras de cálculo

- Estreia = primeira edição do Mundial realizada naquela pista; não confundir com ano da inauguração.
- Temporadas disputadas = contagem de anos distintos com corrida realizada. Total de GPs = contagem de edições, podendo haver dois no mesmo ano.
- Mais vitoriosos = vitórias na corrida principal, por `driver_id`, com empates. Sprint não soma nesse indicador.
- Último vencedor = resultado da edição mais recente naquela pista, independentemente do nome comercial do evento.
- Manter suporte a vencedores compartilhados em resultados antigos: total de edições não é simplesmente número de linhas de vencedores.
- Estatística incompleta deve ser identificada e não apresentada como recorde histórico completo. Preferir completar o pequeno catálogo de vencedores antes do lançamento.
- Não presumir identidade por país, cidade, título do GP ou slug da página. Na pesquisa de 2026, o slug oficial `bahrain` aponta para um GP em Sepang; o vínculo correto precisa usar a pista da etapa.

### Importação e consultas

Importador administrativo obtém os circuitos do calendário e seus identificadores, concilia fontes e carrega vencedores históricos **das pistas desta entrega**, com paginação e retomada. Não precisa baixar todos os resultados de 1950 até hoje para montar o ranking de vencedores: Jolpica aceita filtro de circuito e posição 1.

Agregar as estatísticas em SQL; criar consultas em `repo.ts`, como `listCircuits`, `getCircuitDetail`, `listCircuitMedia` e `listCircuitWinners`. O telefone consulta Supabase, sem abrir várias APIs externas ao entrar no perfil.

Novas tabelas terão leitura do conteúdo publicado por autenticados e escrita apenas pelo processo administrativo/servidor. Storage com leitura das mídias publicadas e upload restrito ao backend. Nenhuma chave administrativa em `app_settings` ou no bundle.

Criar a próxima migration disponível, sem editar migrations aplicadas. Aplicar e validar os dados antes do cliente. Ao alterar o adaptador F1, manter a cópia da Edge Function sincronizada. O calendário e os resultados esportivos existentes não serão recriados só para adicionar o catálogo.

## Notícias: substituir Ao vivo

A aba passa a “Notícias”, com destaque principal e feed cronológico. Filtros propostos: Todas, Notícias e Curiosidades. Fonte e horário em Brasília visíveis, resumo curto e ação “Ler na fonte”. Abrir a publicação em navegador integrado quando compatível, preservando o retorno ao app. Não carregar páginas completas em WebView dentro de cada cartão.

Curiosidades serão conteúdo próprio, fundamentado e distinto de manchetes. Primeira base: fatos calculados e revisados do catálogo de pistas/pilotos, marcos históricos e explicações técnicas com fontes. É possível agendar esses posts no servidor, sem exigir que o usuário escreva conteúdo. Não usar um gerador livre de fatos sem verificação.

### Coletor automático

Fluxo: **Cron Supabase → Edge Function de coleta → normalização e deduplicação → banco → app**.

- Fontes candidatas iniciais: RSS F1 do Motorsport Brasil e RSS F1 do Grande Prêmio. Confirmar condições específicas de uso antes de habilitar cada integração; RSS disponível não autoriza copiar matéria/foto integral.
- Buscar a cada dez minutos como configuração inicial, com `ETag`/`Last-Modified` quando disponíveis. Um job único equivale a 144 execuções/dia; isso é previsão de carga, não medição de custo. Observar o feed curto de dez itens e ajustar frequência se houver risco de perder publicações em rajadas.
- Importar título, descrição permitida, autor/fonte, URL canônica e data real. Higienizar HTML; ignorar `content:encoded` integral do Grande Prêmio. Resumo curto, sem copiar o corpo da matéria. Quando a fonte não permitir descrição, usar título, fonte e link.
- Não incluir RSS F1 em um agregador traduzido sem autorização compatível com seus termos. F1/FIA continuam referências oficiais para conferência e links.
- Imagem de notícia só quando permitida pela fonte; caso contrário, cartão editorial consistente com identificação da fonte. Não presumir que toda imagem de RSS pode ser copiada para nosso bucket.
- Deduplicar por URL canônica/identificador e hash; alterações atualizam o item. Matérias diferentes sobre o mesmo assunto podem ser agrupadas, sem apagar análises distintas.
- Manter datas de publicação, atualização e coleta separadas. Fonte indisponível mantém o último conteúdo, com estado honesto de atualização.
- Falhas de uma fonte não interrompem as demais; limitar concorrência, tamanho das respostas e tentativas. Registrar status por fonte e evitar execuções sobrepostas.

Entidades sugeridas: `content_sources`, `content_posts`, `content_post_sources` e `content_sync_runs`. Posts têm tipo, idioma, status de publicação, título, resumo, data, origem e vínculo opcional com pista/piloto/equipe.

Credenciais de agendamento ficam no Vault/secrets do servidor, sem repetir a exposição de segredos em `app_settings`. Endpoint coletor não será um comando administrativo aberto a qualquer membro. O app apenas lê itens publicados; toda a coleta ocorre mesmo sem ninguém com o app aberto.

A primeira versão não depende de contratar uma API de IA para reescrever notícias. Eventual resumo gerado/tradução demanda uma decisão própria de provedor, custo e validação; não é pré-requisito para o feed em português.

Ao substituir Ao vivo, não montar monitor, autenticar OpenF1 ou iniciar seus timers. Fotos esportivas e grid de largada continuam independentes. Preservar compatibilidade de links da rota antiga ou redirecioná-los para Notícias.

## Sequência de implementação e entrega

1. **Acervo e piloto visual:** finalizar curadoria de quatro pistas representativas — Interlagos, Suzuka, Monza e Madrid. Escolher arquivos reutilizáveis, preparar variantes e conferir mapas. Usar o mesmo componente final de catálogo/perfil. Validar fotos, mapas e navegação em iPhone e Android antes de repetir para todas.
2. **Base de dados e estatísticas:** migration, relação com corridas, importador retomável, catálogo completo de vencedores das pistas atuais e consultas SQL/RLS. Conferir amostras nas fontes oficiais.
3. **Todas as pistas atuais:** terminar as galerias e perfis, integrar corrida/bolão, busca, cache e estados de erro. Só considerar a primeira entrega pronta quando a cobertura combinada estiver completa e revisada.
4. **Históricas:** conciliar os demais IDs, imagens e layouts; incluir o filtro por participação no calendário e preencher perfis. Não confundir a existência de 78 IDs na fonte com 78 perfis prontos.
5. **Notícias:** fontes habilitadas após revisão, cron/Edge Function, feed em português e posts de curiosidades. Substituir a aba Ao vivo após o coletor ter dados e histórico de funcionamento.

O piloto visual é uma etapa interna da primeira entrega; não reduz o escopo confirmado a quatro pistas. Uma previsão de prazo/custo responsável deve ser refinada após esse piloto e a revisão das licenças/galerias — a curadoria é o maior componente variável.

## Critérios para aprovar cada entrega

- Pista/traçado/imagem correspondem à identidade correta; curvas legíveis com zoom e ano/versão informado.
- Todas as pistas atuais têm capa, galeria curada, mapa e indicadores confirmados; não preencher ausências com fotos de outro circuito.
- Estatísticas cobrem o histórico anunciado, preservam empates e ignoram sprint; anos com dois GPs, interrupções no calendário e mudanças de nome têm testes.
- Seis abas legíveis; busca, retorno ao palpite e visualizador utilizáveis em iPhone e Android; fonte ampliada, safe areas e Android Back conferidos.
- Rolar o catálogo não baixa originais de todas as pistas; galeria carrega sob demanda. Verificar memória, cache, rede lenta, sem rede e falha de imagem.
- Notícias em português, F1 apenas, sem duplicatas evidentes, com fonte/data/link; coleta independe de sessões dos usuários e não roda no cliente.
- Testes SQL/RLS para novos acessos e cálculos; testes de importador, paginação, duplicatas, correções e falhas parciais. Cron/net precisam de smoke test separado da suíte PGlite.
- TypeScript, exportações web/iOS/Android e navegação. Teste de aparelho continua necessário; emulação de viewport não substitui isso.
- Preservar SDK 58 e o APK SDK 57 existente: evitar módulo nativo novo sem necessidade; validar e publicar port rastreável quando a alteração for OTA compatível. Se algum visualizador exigir módulo ausente, explicitar a necessidade de novo binário antes de adotá-lo.
- Commit e push do código validado antes da publicação; banco e dados primeiro, cliente depois. Documentação do produto e relatório de publicação atualizados na entrega.

## Pendências conhecidas da pesquisa

A curadoria final das fotos e a validação de reutilização por arquivo continuam abertas; os 132 candidatos não foram todos inspecionados individualmente. A avaliação oficial foi feita em pranchas de contato e amostras de mapas originais, não em 23 aparelhos/perfis montados. Não foi realizada importação em produção, checagem do plano/cotas do Supabase, licenciamento pago ou teste em aparelho físico. Essas etapas fazem parte da execução proposta, não são entregas já concluídas.

## Fontes principais

- [Calendário e páginas oficiais da F1](https://www.formula1.com/en/racing/2026), incluindo [Madrid](https://www.formula1.com/en/racing/2026/spain) e [Sepang na etapa com slug Bahrain](https://www.formula1.com/en/racing/2026/bahrain).
- [Documentos de mapas FIA](https://www.fia.com/documents/circuit-maps), [guia oficial Suzuka](https://www.suzukacircuit.jp/eng/course_s/) e [guia oficial Monza](https://www.monzanet.it/en/circuit/).
- [Documentação Jolpica de resultados por circuito](https://github.com/jolpica/jolpica-f1/blob/main/docs/endpoints/results.md), [calendário consultado](https://api.jolpi.ca/ergast/f1/2026.json?limit=100) e [catálogo de circuitos consultado](https://api.jolpi.ca/ergast/f1/circuits.json?limit=100).
- [Condições F1 e RSS](https://www.formula1.com/en/information/legal-notices.7egvZU48hzrypubGBNcQKt), [diretrizes F1](https://www.formula1.com/en/information/guidelines.4EOKE9RRqevL4niTK9kWyt) e [reutilização Wikimedia por arquivo](https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia).
- [RSS oferecidos pelo Motorsport Brasil](https://motorsport.uol.com.br/rss/), [feed específico F1](https://motorsport.uol.com.br/rss/f1/news/), [termos Motorsport](https://motorsport.uol.com.br/info/terms-of-use/) e [feed F1 Grande Prêmio verificado](https://grandepremio.com/br/f1/feed/).
- [Agendamento de Edge Functions Supabase](https://supabase.com/docs/guides/functions/schedule-functions), [transformação de imagens e requisito de plano](https://supabase.com/docs/guides/storage/serving/image-transformations) e [cache de imagens Expo](https://docs.expo.dev/versions/latest/sdk/image/).

## Curadoria da primeira entrega

90 fotos e 23 mapas com variantes WebP, autoria, licença e período individualizados em `data/circuits`. A meta de quatro fotos foi atendida em 22 pistas; Madring recebe duas imagens verificadas. Não se completou a quantidade com fotos de outras pistas ou imagens de pessoas sem o circuito. A descrição de cada foto informa época/categoria; os mapas foram conferidos separadamente das fotografias. Estatísticas usam 708 registros de vencedores, com paginação completa da fonte. A seção Sobre e a ficha do GP foram adicionadas sem remover as seções previstas.
