# Produto e desenho da experiência

O Bolão F1 é um aplicativo familiar de palpites de Fórmula 1, acompanhado de calendário, resultados, campeonatos e consulta histórica. O mesmo código atende Android, iPhone e navegador. `stake_label` é apenas texto sobre uma aposta simbólica: não existe cobrança, carteira, pagamento ou distribuição de prêmio implementados.

## Pessoas e jornadas

| Pessoa | Jornada implementada |
|---|---|
| Visitante | Acessa login/cadastro ou página pública de convite |
| Participante autenticado | Edita nome/avatar, cria ou entra em bolão, palpita, compara respostas e consulta ranking e dados esportivos |
| Organizador | É o criador do bolão; configura antecedência do fechamento e aposta simbólica, adiciona/remove perguntas e registra/corrige resultados |

O cadastro usa nome, e-mail e senha de pelo menos seis caracteres na interface. O backend cria `profiles` por trigger. Não há fluxo de recuperação de senha na interface atual. O perfil permite escolher entre emojis predefinidos.

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
  Home --> Live[Ao vivo]
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

Rotas do Expo Router: `(tabs)` contém Bolões, Ranking, Corridas, F1/Campeonato e Ao vivo; `pool/[id]/(tabs)` contém próxima corrida, classificação, corridas e participantes. Detalhes ficam em `race/[id]`, `driver/[id]`, `team/[name]`, `pool/[id]/race/[raceId]` e `pool/[id]/admin/[raceId]`.

## Regras de palpite e apuração

Cada GP de F1 de um bolão recebe uma pergunta de pódio automaticamente. O participante escolhe até três pilotos; o seletor evita repetir um piloto em duas posições. Cada alteração dispara salvamento após **600 ms**, por pergunta, com indicação de salvamento ou alerta de erro. Não existe fila persistente de envio offline.

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
- Ao vivo: sessão mais recente, torre de tempos, pneus, setores, clima, mensagens da direção, telemetria selecionada e simulação do campeonato. A simulação aplica tabelas de pontos no cliente e não apura o bolão. O acesso em tempo real depende do provedor e de credenciais; não foi testado em uma sessão ativa nesta investigação.

O monitor Ao vivo fica **desabilitado por padrão**, com aviso sobre assinatura OpenF1. `EXPO_PUBLIC_LIVE_ENABLED=true` habilita o monitor em um novo bundle. Desligado, não monta o componente do monitor nem consulta autenticação, sessão ou telemetria OpenF1. Calendário, resultados e importação de fotos continuam disponíveis. Configuração e validações em [TASKS.md](TASKS.md).

## Linguagem visual

Tema escuro fixado em `app.json` e `src/ui/theme.ts`: fundo `#0B0B0F`, cartões `#16161D`, superfície secundária `#1F1F29`, vermelho principal `#E10600`, texto `#F4F4F6`, texto secundário `#9A9AAB`. Verde indica acerto/estado aberto; ouro, prata e bronze identificam pódio. Escala de espaçamento de 8 px e raio base de 14 px.

`src/ui/primitives.tsx` concentra Screen, Card, Row, títulos, textos, botões, campos e badges. `Screen` considera área segura, teclado e rolagem até o campo focado. Seletores de piloto/posição e o quadro em cartões ou tabela organizam a entrada e a comparação de palpites. Gráficos históricos são compostos de Views React Native, sem biblioteca nativa de gráficos.

Ainda não há especificação formal de acessibilidade, testes de usabilidade ou catálogo visual. A configuração é retrato, sem suporte declarado a tablet no iOS. A web exportada é uma SPA; adicionar à tela inicial não comprova suporte offline/PWA completo.

## Itens do plano que não devem ser tratados como entregues

Notificações push, ranking como imagem, desempate configurável, setas de evolução do ranking do bolão, bolão de sprint e distribuição pelas lojas não aparecem implementados. O plano original também fala em OTP e palpites ocultos: o código atual usa senha e palpites visíveis.

## Bolões em andamento e finalizados

Meus bolões separa Em andamento (primeiro, destaque verde) de Finalizados. Dentro de cada grupo, a criação mais recente aparece primeiro; o catálogo segue a mesma prioridade e exibe status. O status também aparece no cabeçalho e no cartão da corrida. Fechar palpites mantém Em andamento até terminar o calendário e apurar todas as perguntas; pendências ficam explícitas. Sem calendário, informa Aguardando calendário. Atualiza ao entrar, retomar o app e a cada 30 s na tela ativa.
