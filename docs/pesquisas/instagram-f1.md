# Instagram da F1 — viabilidade em 30/10/2026

Pesquisa solicitada junto da revisão de UI. Foram consultadas fontes primárias. As páginas da Meta retornaram 429 no navegador de pesquisa, mas responderam HTTP 200 na consulta direta, com o conteúdo de requisitos legível. Não foram usados serviços de scraping, contas, tokens ou publicações inventadas. Nenhuma coleta do Instagram foi ativada nesta entrega.

## O que é possível

- **Post conhecido:** o [Instagram oEmbed](https://developers.facebook.com/docs/instagram-platform/oembed/) entrega o HTML oficial de uma URL pública. A documentação consultada exemplifica chamada sem token. Aceita fotos, carrosséis, vídeos, reels e perfis; não stories, contas privadas/inativas/com restrição de idade ou incorporações desabilitadas. Limite documentado de 1.000 solicitações por hora. Exibir o embed completo, sem transformar o retorno em banco de legendas/imagens ou resumir o conteúdo extraído. Esse endpoint incorpora uma URL; não descobre sozinho os novos posts de @f1.
- **Coleta automática de novos posts:** [Business Discovery](https://developers.facebook.com/documentation/instagram-platform/instagram-graph-api/reference/ig-user/business_discovery/) permite consultar contas profissionais de terceiros e a borda media. Requer uma conta profissional consultante, API com Facebook Login e token de usuário com instagram_basic, instagram_manage_insights e pages_read_engagement. A necessidade de permissões adicionais depende do vínculo da Página. Validar acesso do app e da conta-alvo em uma integração real; nenhuma credencial Meta está configurada para esse trabalho. Não pressupor acesso por ter apenas o username público.
- A [coleção oficial da Meta](https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api) confirma o fluxo de app/token e conta profissional vinculada à Página no Facebook Login. Instagram Login tem outro escopo e não deve ser tratado como substituto automático da descoberta de terceiros.
- As [diretrizes oficiais da F1](https://www.formula1.com/en/information/guidelines.4EOKE9RRqevL4niTK9kWyt), seção Social media and mobile services, permitem o compartilhamento pelas funções da plataforma e incorporação completa com link à origem, sem sugerir associação oficial. Não permitem copiar e republicar os posts fora desse formato.

## Encaixe no produto

O caminho recomendado é um bloco de publicações oficiais separado das notícias em português: manter permalink e identificação da origem; carregar a incorporação oficial somente ao abrir, com link de saída se o post deixar de estar disponível. Não traduzir a legenda do embed como se fosse publicação original em português, baixar/republicar vídeos, nem executar HTML recebido como parte do feed principal.

No Android/iPhone já distribuídos, abrir o post no navegador interno existente preserva a compatibilidade OTA. Embed dentro de uma WebView nativa exigiria avaliar dependência e novo binário; não foi adicionado nesta revisão. Na web, o embed precisa de isolamento, avaliação do conteúdo e fallback; seu peso não deve prejudicar a rolagem de Notícias.

Para automação posterior: Edge Function no Supabase com credenciais apenas em secrets, allowlist de contas oficiais verificadas, paginação/deduplicação, intervalos e falhas isoladas do RSS atual. Fazer prova de acesso a @f1 antes de criar tabelas/cron ou anunciar a funcionalidade como disponível. Incorporar e descobrir posts são operações distintas. Não substituir o RSS funcional por uma integração ainda sem acesso validado.
