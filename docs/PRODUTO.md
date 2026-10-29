# Produto e desenho da experiência

O Bolão F1 é um aplicativo familiar de palpites de Fórmula 1, acompanhado de calendário, resultados, campeonatos e consulta histórica. O mesmo código atende Android, iPhone e navegador. `stake_label` é apenas texto sobre uma aposta simbólica: não existe cobrança, carteira, pagamento ou distribuição de prêmio implementados.

## Pessoas e jornadas

| Pessoa | Jornada implementada |
|---|---|
| Visitante | Acessa login/cadastro ou página pública de convite |
| Participante autenticado | Edita nome/avatar, cria ou entra em bolão, palpita, compara respostas e consulta ranking e dados esportivos |
| Organizador | É o criador do bolão; configura antecedência do fechamento e aposta simbólica, adiciona/remove perguntas e registra/corrige resultados |

O cadastro usa nome, e-mail e senha de pelo menos seis caracteres na interface. O backend cria `profiles` por trigger. A entrada permite solicitar recuperação por e-mail; o link abre a página de troca de senha no navegador, inclusive quando solicitado no app. O perfil permite escolher entre emojis predefinidos.

O usuário pode criar um bolão da temporada atual inteira ou de um único GP futuro; a interface começa com a opção de um GP. O criador entra automaticamente como membro. Bolões disponíveis aparecem para os demais usuários autenticados, com entrada em um toque. Também há código de convite e compartilhamento pelo menu nativo do aparelho, com texto voltado ao WhatsApp.

O proprietário pode excluir definitivamente um bolão na aba de participantes, mediante confirmação. Membros, perguntas, palpites e apurações daquele bolão são removidos; contas e dados esportivos oficiais permanecem. O bolão e seus pontos deixam de aparecer nos próximos carregamentos. A permissão de exclusão é verificada no banco.

## Navegação

```mermaid
flowchart TD
  Convite[entrar.html?c=CODIGO] --> Join[/join/CODIGO]
  Join --> Login[Login ou cadastro]
  Login --> Home[Bolões]
  Join --> Pool[Bolão]
  Home --> Pool
  Home --> Geral[Ranking geral]
  Home --> Calendario[Corridas]
  Home --> Campeonato[Campeonato]
  Home --> Live[Notícias]
  Pool --> Palpite[Próxima corrida e palpites]
  Pool --> Ranking[Classificação]
  Pool --> CorridasBolao[Corridas do bolão]
  Pool --> Galera[Participantes e configurações]
  Palpite --> Admin[Apuração do organizador]
  Calendario --> GP[Detalhe de corrida]
  Campeonato --> Piloto[Perfil de piloto]
  Campeonato --> Equipe[Perfil de equipe]
  Piloto <--> Equipe
```

Rotas do Expo Router: `(tabs)` contém Bolões, Ranking, Corridas, F1/Campeonato, Pistas e Notícias; `pool/[id]/(tabs)` contém próxima corrida, classificação, corridas e participantes. Detalhes ficam em `race/[id]`, `driver/[id]`, `team/[name]`, `pool/[id]/race/[raceId]` e `pool/[id]/admin/[raceId]`.

## Regras de palpite e apuração

Cada GP de F1 de um bolão recebe uma pergunta de pódio automaticamente. O participante escolhe até três pilotos; o seletor evita repetir um piloto em duas posições. Cada alteração dispara salvamento após **600 ms**, por pergunta, com indicação de salvamento ou alerta de erro. Rascunhos ficam em uma fila persistente por conta no aparelho. A interface só confirma depois da resposta do servidor; falhas são reenviadas com conexão, sem ultrapassar o prazo. Falha de armazenamento é informada e não impede envio online.

Os palpites ficam abertos até `date_utc - lock_minutes_before`; zero significa a largada. O app atualiza a indicação de tempo a cada 30 segundos, mas a decisão de aceitar a escrita pertence ao relógio e às políticas do banco. **Todos os membros veem os palpites dos demais mesmo antes do fechamento**, conforme a migration `0007` e o componente `PicksBoard`.

| Pergunta | Resposta | Pontuação |
|---|---|---|
| Pódio | `p1`, `p2`, `p3`, com siglas | Por posição: 3 pontos exatos ou 1 se o piloto estiver em outra posição do pódio; máximo 9 |
| Piloto | `driver` | `points` quando coincide com o resultado |
| Posição de um piloto | `pos` (zero representa DNF na interface) | `points` no acerto; `near_points` se a diferença numérica for 1 |
| Sim/não | `v`, booleano | `points` no acerto |
| Texto livre | `t`; resultado contém `correct_users` | Organizador marca os usuários que acertaram; cada um recebe `points` |

Nas perguntas de posição, o piloto é descrito no enunciado; não existe campo relacional específico para ele. Sugestões prontas: pole, volta mais rápida, primeiro abandono e safety car. As extras são apuradas manualmente. A importação manual do pódio mostra uma prévia e exige tocar em Salvar apuração.

A sincronização do servidor preenche pódios ainda sem resultado; não sobrescreve apurações existentes. Uma correção esportiva posterior exige revisão do organizador. O ranking soma pontos por bolão, mostra quantidade de corridas com pontuação apurada e pontos da última corrida. Empates não têm critério secundário de desempate; o resumo SQL usa `rank()`, enquanto a lista mostra a ordem das linhas. Compartilhamento do ranking é texto.

A aba Ranking geral soma todos os bolões existentes, de todos os anos, inclusive encerrados e bolões em que quem consulta não participa. Empates compartilham posição. Membros sem pontos aparecem; perfis sem bolões não aparecem. O mesmo GP em dois bolões conta duas vezes. A tela consulta os totais ao abrir, ao voltar ao primeiro plano e a cada 30 segundos enquanto estiver focada/ativa; também permite atualizar manualmente. Não há desempate adicional nem atualização por WebSocket.

Para o proprietário, a tela da corrida identifica Modo participante / seu palpite. O acesso Abrir apuração oficial leva ao Modo organizador, que explica que salvar resultados altera a pontuação de todos. O formulário administrativo só é exibido ao proprietário e tem botão de voltar aos próprios palpites; essa separação não altera os formulários de resposta.

## Conteúdo esportivo

- F1: seleção do ano atual até 1950; calendário e classificações podem ser importados ao abrir um ano ainda sem dados. A disponibilidade histórica depende do que foi importado e da fonte.
- F2/F3: seleção na temporada atual, calendário, equipes/pilotos, classificação e resultados parciais da feature. Não participam dos bolões. Horários provisórios são marcados como a confirmar.
- Detalhe de GP e bolão: **Grid de largada** e **Resultado final da corrida** são seções independentes. O grid usa posições dos resultados históricos ou `starting_grid` OpenF1 (2023+). Enquanto indisponível, exibe aviso; a **qualy** pode aparecer em outra seção como referência, sem preencher o grid. Antes do resultado final, a chegada permanece indisponível. Depois, cada linha da chegada informa também de onde o piloto largou. No bolão aberto, mostra cinco posições com botão para expandir todos; o seletor de pilotos ordena por largada e mostra “Larga em P…”, também no pódio escolhido. Qualy e chegada nunca preenchem essa informação. Atualização manual e consulta a cada minuto em foco/app ativo; cache público de dois minutos. Histórico usa dados existentes sem reimportação, sujeito à cobertura da fonte. Programação em Brasília e F2/F3 próximas (janela de ±3 dias) permanecem disponíveis.
- Piloto F1: foto quando disponível, carreira, rankings, desempenho por temporada/equipe, gráficos e comparação com outro piloto. Confronto direto considera corridas em que foram companheiros de equipe.
- Equipe F1: história, títulos, pilotos, temporadas, gráficos e comparação de classificações entre equipes. A identidade é o nome normalizado; nomes diferentes de uma mesma linhagem não são fundidos.
- Notícias: manchetes F1 em português, resumo do RSS e link para a fonte, em ordem cronológica. Filtros Todas, Notícias e Curiosidades; destaque para a publicação mais recente e paginação. Curiosidades próprias são calculadas do acervo, uma por dia, com acesso ao perfil da pista. Fonte e horários em Brasília são visíveis. Sem fotografias de notícias nesta entrega.

A rota antiga `/live` agora abre Notícias. Não importa nem monta o monitor OpenF1; calendário, grid e fotos de pilotos continuam independentes. A coleta ocorre no Supabase, inclusive sem o app aberto. Atualizar a lista no telefone lê o banco, sem acionar o coletor.

## Linguagem visual

Tema escuro fixado em `app.json` e `src/ui/theme.ts`: fundo `#0B0B0F`, cartões `#16161D`, superfície secundária `#1F1F29`, vermelho principal `#E10600`, texto `#F4F4F6`, texto secundário `#9A9AAB`. Verde indica acerto/estado aberto; ouro, prata e bronze identificam pódio. Escala de espaçamento de 8 px e raio base de 14 px.

`src/ui/primitives.tsx` concentra Screen, Card, Row, títulos, textos, botões, campos e badges. `Screen` considera área segura, teclado e rolagem até o campo focado. Seletores de piloto/posição e o quadro em cartões ou tabela organizam a entrada e a comparação de palpites. Gráficos históricos são compostos de Views React Native, sem biblioteca nativa de gráficos.

Ainda não há especificação formal de acessibilidade, testes de usabilidade ou catálogo visual. A configuração é retrato, sem suporte declarado a tablet no iOS. A web exportada é uma SPA; adicionar à tela inicial não comprova suporte offline/PWA completo.

## Itens do plano que não devem ser tratados como entregues

Notificações push, ranking como imagem, desempate configurável, setas de evolução do ranking do bolão, bolão de sprint e distribuição pelas lojas não aparecem implementados. O plano original também fala em OTP e palpites ocultos: o código atual usa senha e palpites visíveis.

## Bolões em andamento e finalizados

Meus bolões separa Em andamento (primeiro, destaque verde) de Finalizados. Dentro de cada grupo, a criação mais recente aparece primeiro; o catálogo segue a mesma prioridade e exibe status. O status também aparece no cabeçalho e no cartão da corrida. Fechar palpites mantém Em andamento até terminar o calendário e apurar todas as perguntas; pendências ficam explícitas. Sem calendário, informa Aguardando calendário. Atualiza ao entrar, retomar o app e a cada 30 s na tela ativa.

## Pistas

A aba Pistas reúne as 23 pistas do calendário F1 atual, com busca por pista/cidade/país, filtros por país e destaque da próxima etapa. A identidade visual usa exclusivamente o traçado oficial da Fórmula 1 em fundo escuro, na lista e no detalhe. O mapa abre em tela cheia com zoom. O detalhe também oferece o book **Por dentro da pista**, separado do mapa, com fotos de curvas e trechos do traçado F1, legenda, período e fonte oficial. Só entram fotos revisadas com o asfalto como assunto principal; quando há carros, são exclusivamente F1. Não entram outras categorias, turismo ou público como assunto. A seleção inicial reúne 15 fotos em seis circuitos; os demais mantêm o mapa até haver fotos adequadas. São exibidos até três trechos inicialmente, com expansão e navegação em tela cheia.

Foram mantidos extensão, curvas, sentido, estreia, temporadas disputadas, total de GPs, maiores vencedores e empates, último vencedor e acesso ao resultado existente. Sobre contém cidade, país, última temporada, vencedores diferentes e recorde de vitórias; a ficha do GP informa voltas, distância e recorde de volta em corrida. Temporadas e edições são contadas separadamente. A correção visual foi seguida pela retomada das históricas e de Notícias, descritas abaixo.


O catálogo também permite alternar entre **Atuais** e **Históricas**, preservando busca e filtros por país. Históricas são as 55 sedes com corridas do Mundial fora do calendário de 2026; isso não significa que estejam desativadas. Seus perfis apresentam cidade/país, configuração de referência datada, extensão, curvas, sentido, temporadas, corridas, último vencedor e ranking histórico. Não exibem fotos ou mapas sem uma fonte oficial aprovada. O catálogo não reutiliza as antigas imagens rejeitadas. Indianapolis distingue o circuito misto das 500 Milhas que também integraram o Mundial; Nürburgring distingue configuração de referência e totais de todas as configurações.


## Ferramentas opcionais do bolão

A corrida mantém seu formulário e acrescenta **Prepare seu palpite** (próxima sessão, prazos por pergunta, pista e notícias vinculadas) e **Explore o seu bolão**, com ferramentas recolhíveis. O seletor de pilotos oferece “Analisar antes de escolher”: até dois candidatos, largada e amostras importadas anteriores ao GP. Ausência de histórico não é apresentada como desempenho zero.

O simulador altera somente o pódio em memória e mostra o efeito no ranking atual, preservando as parcelas das demais perguntas. Usa apenas palpites confirmados e nunca escreve resultados. O termômetro mostra distribuição por posição entre participantes atuais que responderam; popularidade não é probabilidade. Raio-X explica pontos e mostra situações oficiais disponíveis, sem inferir causas.

O perfil de participante, acessível pelo ranking ou pela corrida, apresenta aproveitamento nas perguntas apuradas, evolução por GP, pistas, acertos por piloto e referência do grid na mesma amostra de corridas encerradas. A retrospectiva reconstrói o acumulado até a etapa escolhida, excluindo resultados posteriores; usa membros e apurações atuais, não afirma ser um snapshot imutável antigo. Compartilha texto no app e exporta cartão PNG na web. Nenhum módulo nativo novo foi incluído.

Qualy e sprint são **perguntas extras opcionais**. O organizador pode aceitar sugestões ou criar uma pergunta e escolher a sessão. Todas as perguntas antigas continuam como Corrida, com os mesmos prazos e pontuação. Não há adesão obrigatória nem criação automática das novas extras. Pódio automático continua sendo exclusivamente da corrida. Horário de sessão precisa existir; a apuração das extras continua manual.

Histórico de apuração registra primeira gravação e correções a partir da implantação, com autor real/instante e valores anteriores/novos. Membros consultam apenas seu bolão e não podem editar o histórico. A remoção de pergunta mantém o registro com o enunciado; excluir definitivamente o bolão também remove seu histórico. Empates compartilham posição no ranking do bolão e no texto de compartilhamento, sem novo desempate ou alteração de pontos.

Pistas oferece seleção de trechos aprovados junto do mapa; Interlagos tem marcadores sobre o mapa oficial de 2026, conferidos visualmente. Outros traçados só recebem marcadores depois de conferência específica. O book permanece com 15 fotos de seis circuitos; não foram adicionadas imagens inadequadas para preencher a cobertura. Alertas, diário do palpite e desafio histórico ficaram fora do escopo, conforme solicitado.
