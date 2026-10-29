# Documentação do Bolão F1

Levantamento em **16/10/2026**, sobre o commit `f3c4bff`. Os documentos descrevem o código e as configurações versionadas; o [diagnóstico](DIAGNOSTICO.md) separa verificações locais, respostas dos serviços publicados e informações ainda não confirmadas nas contas de nuvem.

O projeto foi migrado para Expo SDK 58 em 24/10/2026; ambiente em Node 22 e links Expo Go atualizados, com publicação registrada na [validação de produção](VALIDACAO_PRODUCAO.md). As adaptações implementadas depois do levantamento estão em [TASKS.md](TASKS.md); os guias abaixo já descrevem exclusão, ranking geral e flag Ao vivo. As migrations até `0027` foram aplicadas no serviço compartilhado. Consulte [validação de produção](VALIDACAO_PRODUCAO.md) para evidências e publicações.

| Documento | Conteúdo |
|---|---|
| [Produto](PRODUTO.md) | Público, jornadas, telas, regras e desenho visual |
| [Arquitetura](ARQUITETURA.md) | Componentes, integrações, estado e fluxos técnicos |
| [Dados e permissões](DADOS.md) | Modelo, migrations, RPCs, pontuação e RLS |
| [Desenvolvimento](DESENVOLVIMENTO.md) | Ambiente, comandos, convenções e validação de mudanças |
| [Infraestrutura e operação](INFRA_OPERACAO.md) | Onde roda, configuração, deploy, recuperação e diagnóstico operacional |
| [Diagnóstico e pendências](DIAGNOSTICO.md) | Evidências da investigação, riscos e próximos trabalhos |
| [Tarefas e validações](TASKS.md) | Exclusão de bolão, ranking geral, flag Ao vivo e clareza na apuração |
| [Validação de produção](VALIDACAO_PRODUCAO.md) | Integração real, publicação e limites dos testes |
| [Instalação](../INSTALACAO.md) | Acesso para usuários em Android, iPhone e navegador |
| [Guia de contribuidores/agentes](../CLAUDE.md) | Contexto resumido e cuidados para futuras tarefas |
| [Plano de Pistas e Notícias](PLANO_PISTAS_NOTICIAS.md) | Pesquisa e implantação de Pistas e Notícias; critérios de curadoria |
| [Plano original](../PLANO.md) | Histórico de intenção; não é especificação do estado atual |

Para começar a trabalhar: leia Produto → Arquitetura → Desenvolvimento → Diagnóstico. Para alterações no backend, leia também Dados e Infraestrutura.

Ao mudar uma regra, tela, variável, migration ou procedimento de publicação, atualize o documento correspondente na mesma alteração. Nunca registre valores de tokens, senhas, sessões ou chaves administrativas nos documentos. Identificadores de projeto e URLs públicas aparecem aqui para tornar a operação rastreável.
