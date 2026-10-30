# Evolução do Bolão F1 — 29/10/2026

Escopo autorizado: implementar as propostas da pesquisa, exceto alertas, diário do palpite e desafio de corrida histórica. Qualy e sprint são opcionais, por perguntas criadas ou sugestões aceitas pelo organizador. Nenhum bolão precisa aderir a modo novo. Pódio, 3/1 pontos, palpites visíveis, ranking geral, prazos atuais e dados existentes permanecem.

## Entregas e critérios

| Ordem | Entrega | Comportamento e aceitação |
|---|---|---|
| 1 | Salvamento confiável | Fila persistente por usuário/pergunta, última edição prevalece, envios sequenciais, confirmação só após resposta do servidor, reconexão/retomada, pendência visível. Prazo do banco continua soberano: nunca enviar rascunho expirado como se aceito. |
| 2 | Empates | Ranking do bolão e compartilhamento usam posição compartilhada; ordem visual determinística, sem inventar desempate. Pontuação não muda. |
| 3 | Recuperação de acesso | Solicitação de link por e-mail e troca de senha via callback suportado em web e app, sem navegação automática que interrompa recuperação. |
| 4 | Auditoria de apuração | Gravar resultados anteriores/novos, autor e instante em tabela protegida. Membro consulta só seu bolão; ninguém edita o histórico. Histórico começa na implantação, sem inventar eventos antigos. |
| 5 | Central do GP | Bloco compacto na corrida do bolão: fechamento, sessões, acesso à pista, situação do grid e notícias relacionadas verificadas por vínculos. Notícias sem vínculo não são apresentadas como sendo daquela etapa. Falha de conteúdo não impede palpitar. |
| 6 | Comparação contextual | Acesso ao escolher piloto: últimas provas da temporada, largada atual e histórico disponível na pista; comparar dois candidatos sem abandonar o formulário. Identidade por driver_id; informar amostra/ausências. |
| 7 | Simulador | Ferramenta recolhível na corrida: pódio hipotético → pontuação e ranking do grupo, substituindo somente a parcela simulada já apurada. Extras reais preservadas; nenhuma escrita em resultados/palpites. Empates corretos. |
| 8 | Raio-X | Após apuração, detalhar acertos de posição/piloto, pontos por pergunta, comparação com grupo e abandonos conhecidos. Não atribuir causalidade nem julgar escolha a partir do resultado. |
| 9 | Perfil de participante | Dentro de cada bolão: evolução, aproveitamento nas perguntas apuradas, melhores etapas e comparação do pódio com referência do grid onde houver dados suficientes. Sem duplicar GP entre bolões nem alterar ranking geral. |
| 10 | Termômetro | Distribuição completa dos votos por posição, quantidade de respostas e escolhas menos frequentes. Popularidade não é probabilidade. Usa visibilidade já existente. |
| 11 | Pista interativa | Associar trechos aprovados do book às curvas numeradas e ao mapa, sem marcar coordenadas adivinhadas. Seleção de trecho abre foto e explicação, mantendo mapa oficial e fonte. Fotos de outras categorias continuam proibidas. |
| 12 | Retrospectiva | Resumo por GP do bolão: pontuação, posições antes/depois com empates e destaques verificáveis. Prévia visual compartilhável; texto sempre disponível se exportação de imagem não for suportada. |
| 13 | Qualy/sprint opcionais | Campo de sessão default corrida para todas as perguntas antigas. Sugestões e criação manual de extras; horários próprios só quando existem. Nada adicionado automaticamente. Pontos escolhidos pelo organizador, apuração manual compatível com o fluxo atual. |
| 14 | Curadoria | Manter manifesto revisado; ampliar apenas com fotos oficiais da pista F1, sem turismo, público como assunto ou outras categorias. Não completar quantidade com material inadequado. |

## Implementação

Mudanças aditivas em migrations a partir de 0028. Queries em repo.ts, cálculos compartilhados para quadro/simulador/análises, sem depender de assinatura ao vivo nem acrescentar previsão de tempo sem fonte. Componentes opcionais/recolhíveis nas rotas atuais: evitar novas abas principais e excesso de informação sobre o formulário.

A fila usa AsyncStorage já presente nos runtimes 57/58. Persistência isolada por conta; não migrar rascunhos para outro usuário. Rejeições permanentes ficam visíveis para ação, sem repetição infinita. Novas consultas têm estados próprios de carregamento/erro; falhas não bloqueiam os palpites atuais.

## Validação e distribuição

Cenários SQL/RLS: dono, membro, não membro, anônimo, prazos por sessão, perguntas antigas default corrida, pontuação inalterada e auditoria imutável. Testes de fila: duas edições concorrentes, falha/reinício, troca de conta e prazo expirado. Cálculos: empates, resultados parciais, simulação antes/depois de apurar e referência do grid sem dados futuros.

TypeScript, suíte atual + cenários novos, exportação web, navegador móvel 390/360 e exportação/compatibilidade SDK 57. Recuperação de conta exige checar redirects configurados no Auth. Publicação somente depois de commit/push do código validado, banco primeiro, cliente depois. Main/preview e port rastreável do APK; nenhum QR novo para mudanças OTA compatíveis. Atualizar evidências em VALIDACAO_PRODUCAO.md.

## Acompanhamento

- [x] Planejamento e regras de compatibilidade registrados.
- [x] Base: salvamento, empates, recuperação e auditoria.
- [x] Contexto: central e comparação ao escolher.
- [x] Disputa: simulação, termômetro, raio-X, perfil e retrospectiva.
- [x] Pistas e perguntas opcionais por sessão.
- [x] Validação integrada e publicação.

Implementação inicial: marcadores conferidos em Interlagos; seleção de trechos nos seis books aprovados. Curadoria fotográfica permanece progressiva, sem restaurar a seleção rejeitada. Cartão exportado em PNG na web e texto no app para manter compatibilidade sem novo binário. Validação e publicação concluídas; evidências em VALIDACAO_PRODUCAO.md.


Envio de recuperação adiado por escolha do usuário em 30/10/2026. Pendência operacional: na conferência do serviço, SMTP próprio não está configurado. O fluxo de callback/troca de senha pode ser validado com link administrativo sem envio, mas a entrega para endereços da família exige provedor SMTP. O padrão do Supabase restringe destinatários à equipe do projeto: https://supabase.com/docs/guides/auth/auth-smtp . Não registrar credenciais em código, app_settings ou documentação. As demais funcionalidades não dependem desse envio.
