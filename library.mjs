const SYSTEM_PROMPT = `
Você é o Literary Universe — Reference Library, pesquisador e curador literário.
Crie uma biblioteca de referência de até 10 livros para compreender o universo literário, intelectual, estético, temático, histórico e intertextual de um autor.

LIMITES DA PESQUISA DESTA VERSÃO GRATUITA:
- Você NÃO tem ferramenta de busca na web nesta chamada. Use exclusivamente o dossiê de fontes e metadados fornecido pelo servidor e seu conhecimento geral com cautela.
- O dossiê pode conter registros bibliográficos e páginas de contexto; metadados bibliográficos não comprovam que o escritor leu, admirou ou foi influenciado por um livro.
- Nunca apresente preferência declarada, leitura ou influência como fato sem evidência explícita no material fornecido.
- Se o dossiê não sustentar uma relação, classifique como "contexto literário" ou "afinidade crítica" e diga claramente que é uma aproximação curatorial.
- Não invente entrevistas, citações, declarações, links, títulos, datas ou relações.
- Use no máximo 10 livros; prefira uma seleção menor a preencher artificialmente.
- Distinga rigorosamente: "preferência declarada", "referência documentada", "afinidade crítica", "contexto literário".
- Selecione obras específicas e explique a função de cada uma na biblioteca.
- Responda em português brasileiro, com rigor e clareza. Não transforme a resposta em biografia.
- Se houver homônimos ou dúvida sobre a identidade do autor, explicite a ambiguidade.

Retorne SOMENTE JSON válido no formato:
{
 "author":"Nome do autor",
 "title":"Biblioteca de referência — Nome",
 "introduction":"2 a 4 frases sobre a seleção e seus limites",
 "books":[{"author":"Autor do livro","title":"Título","evidence_type":"preferência declarada | referência documentada | afinidade crítica | contexto literário","role":"Função na biblioteca","connection":"Relação e limites da evidência","reading_value":"O que observar na leitura","source_url":"URL do dossiê que sustenta a relação ou vazio"}],
 "reading_path":"Percurso sugerido",
 "sources":[{"title":"Título","url":"URL exata do dossiê","description":"O que o registro realmente sustenta"}],
 "method_note":"Explique que esta versão usa fontes bibliográficas/contextuais abertas e não busca web em tempo real; diferencie evidência e interpretação."
}
`;

const headers = { "User-Agent": "LiteraryUniverseReferenceLibrary/1.0 (educational project)" };

async function safeJson(url) {
  try {
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(9000) });
    if (!response.ok) return null;
    return await response.json();
  } catch { return null; }
}

async function buildDossier(author) {
  const q = encodeURIComponent(author);
  const [wiki, books, works] = await Promise.all([
    safeJson(`https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${q}&gsrlimit=5&prop=extracts|info&exintro=1&explaintext=1&inprop=url&format=json&origin=*`),
    safeJson(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(`inauthor:${author}`)}&maxResults=10&printType=books`),
    safeJson(`https://api.openalex.org/works?search=${q}&per-page=12&select=id,doi,title,publication_year,authorships,abstract_inverted_index,primary_location`)
  ]);

  const sources = [];
  for (const page of Object.values(wiki?.query?.pages || {})) {
    if (page.extract) sources.push({ type: "context_page", title: page.title, url: page.fullurl || `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title.replaceAll(" ", "_"))}`, excerpt: page.extract.slice(0, 3500) });
  }
  for (const item of books?.items || []) {
    const info = item.volumeInfo || {};
    sources.push({ type: "book_catalog_record", title: info.title || "Sem título", authors: info.authors || [], publishedDate: info.publishedDate || "", description: (info.description || "").slice(0, 1200), url: info.infoLink || `https://books.google.com/books?id=${item.id}` });
  }
  for (const work of works?.results || []) {
    const inverted = work.abstract_inverted_index || {};
    const words = [];
    for (const [word, positions] of Object.entries(inverted)) for (const pos of positions) words[pos] = word;
    const authors = (work.authorships || []).map(a => a.author?.display_name).filter(Boolean);
    sources.push({ type: "academic_metadata", title: work.title || "Sem título", authors, year: work.publication_year || "", abstract: words.join(" ").slice(0, 1800), url: work.doi || work.primary_location?.landing_page_url || work.id });
  }
  return sources.slice(0, 28);
}

export default async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return Response.json({ error: "A aplicação ainda não está conectada ao Gemini. Configure GEMINI_API_KEY nas variáveis de ambiente da Netlify." }, { status: 503 });

  let body;
  try { body = await req.json(); } catch { return Response.json({ error: "Pedido inválido." }, { status: 400 }); }
  const author = String(body.author || "").trim().slice(0, 120);
  if (!author) return Response.json({ error: "Informe o nome de um autor." }, { status: 400 });

  try {
    const dossier = await buildDossier(author);
    const prompt = `AUTOR SOLICITADO: ${author}\n\nDOSSIÊ DE FONTES ABERTAS (metadados e extratos):\n${JSON.stringify(dossier)}\n\nConstrua a biblioteca usando o dossiê com rigor. Não trate catálogo de livros como prova de leitura/influência. Não invente evidências. Se o dossiê for insuficiente, seja explícito e mantenha a seleção mais curta.`;
    const model = process.env.GEMINI_MODEL || "gemini-3.6-flash";
    const upstream = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.25, maxOutputTokens: 6500 }
      }),
      signal: AbortSignal.timeout(50000)
    });
    const raw = await upstream.json();
    if (!upstream.ok) {
      const detail = raw?.error?.message || "Falha no serviço Gemini.";
      return Response.json({ error: `A pesquisa não pôde ser concluída: ${detail}` }, { status: 502 });
    }
    const outputText = raw?.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("\n").trim();
    if (!outputText) return Response.json({ error: "O Gemini retornou uma resposta vazia. Tente novamente." }, { status: 502 });
    let parsed;
    try { parsed = JSON.parse(outputText); } catch { return Response.json({ error: "A resposta veio em formato inesperado. Tente novamente." }, { status: 502 }); }
    const allowedUrls = new Set(dossier.map(item => item.url).filter(Boolean));
    parsed.books = Array.isArray(parsed.books) ? parsed.books.slice(0, 10).map(book => ({
      ...book,
      source_url: allowedUrls.has(book.source_url) ? book.source_url : ""
    })) : [];
    parsed.sources = Array.isArray(parsed.sources) ? parsed.sources.slice(0, 20)
      .filter(source => allowedUrls.has(source.url)) : [];
    return Response.json(parsed);
  } catch (error) {
    return Response.json({ error: "Erro de conexão ao realizar a pesquisa. Tente novamente mais tarde." }, { status: 500 });
  }
};
