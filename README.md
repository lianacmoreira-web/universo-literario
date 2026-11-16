# Literary Universe — Reference Library

Aplicação web editorial para criar bibliotecas de referência literária a partir do nome de um autor.

## Versão gratuita — como funciona

- Interface responsiva em português.
- Gemini API via Netlify Function (a chave fica no servidor).
- Consulta fontes abertas: Wikipedia (contexto), Google Books (catálogo bibliográfico) e OpenAlex (metadados acadêmicos).
- Curadoria de até 10 livros, categorias de evidência, fontes e percurso de leitura.
- Impressão / salvar como PDF pelo navegador.

**Limite importante:** a camada gratuita da Gemini API não inclui grounding com Google Search para o modelo escolhido. Por isso, esta versão consulta fontes abertas específicas e usa o Gemini para organizar e interpretar os dados. Ela não equivale a uma busca ampla na web nem garante localizar entrevistas e declarações primárias. O sistema deve marcar como afinidade crítica/contexto literário o que não estiver comprovado. Revise as fontes antes de uso acadêmico.

## Requisitos gratuitos

- Conta GitHub Free.
- Conta Netlify Free.
- Chave Gemini API criada no Google AI Studio, usando um projeto no nível gratuito e um modelo disponível no free tier.

O nível gratuito tem limites de uso sujeitos a alteração. No free tier, o Google informa que os dados podem ser usados para melhorar produtos. Não envie dados pessoais ou confidenciais. Consulte preços e condições: https://ai.google.dev/gemini-api/docs/pricing

## Publicar / atualizar na Netlify

1. Envie o conteúdo desta pasta para a raiz do repositório GitHub (não envie o ZIP como arquivo único).
2. Na Netlify, importe o repositório ou aguarde o deploy automático após o commit.
3. Em **Project configuration → Environment variables**, crie `GEMINI_API_KEY` com a chave criada no Google AI Studio. Deixe a variável disponível para **Functions**.
4. Crie `GEMINI_MODEL` com `gemini-3.6-flash` (ou outro modelo que esteja explicitamente disponível no nível gratuito da sua conta).
5. Remova qualquer variável antiga `OPENAI_API_KEY` ou `OPENAI_MODEL` deste projeto.
6. Faça um novo deploy para aplicar as variáveis.
7. Teste a pesquisa com um autor conhecido e confira as fontes antes de compartilhar.

## Segurança

- Nunca coloque a chave em `app.js`, `index.html` ou em qualquer arquivo público.
- Nunca envie `.env` ao GitHub. O arquivo `.env.example` não contém segredo.
- Configure a chave exclusivamente na Netlify, com escopo Functions.
- A aplicação é pública e não tem autenticação nem limite por visitante. Acompanhe as cotas do Gemini e considere restringir abuso antes de divulgar amplamente.

## Estrutura

- `index.html`, `styles.css`, `app.js`: interface.
- `netlify/functions/library.mjs`: consulta fontes abertas e chama Gemini.
- `netlify.toml`: configuração Netlify.

## Fontes técnicas

- Gemini API: https://ai.google.dev/gemini-api/docs
- Preços e free tier: https://ai.google.dev/gemini-api/docs/pricing
- Netlify Functions: https://docs.netlify.com/build/functions/overview/
- Variáveis de ambiente Netlify: https://docs.netlify.com/build/functions/environment-variables/
- OpenAlex API: https://docs.openalex.org/
- Google Books API: https://developers.google.com/books/docs/v1/using
- MediaWiki API: https://www.mediawiki.org/wiki/API:Search

## Limitações

- A seleção é assistida por IA e deve ser revisada.
- Catálogos e metadados não provam influência literária.
- A versão gratuita não faz busca web abrangente/grounded nem garante fontes primárias.
- A impressão/PDF usa o recurso de impressão do navegador.
