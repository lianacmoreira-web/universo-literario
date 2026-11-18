
const SYSTEM_PROMPT = `
Você é o Literary Universe — Reference Library, versão acadêmica 2.0.
Sua missão é recomendar ATÉ 10 LIVROS EXCLUSIVAMENTE DE OUTROS AUTORES para compreender o universo literário, intelectual, estético, histórico e intertextual do escritor solicitado.

REGRAS OBRIGATÓRIAS:
- NÃO inclua livros do escritor pesquisado, nem livros em coautoria com ele, na lista principal. Obras dele podem ser citadas apenas nas explicações.
- Não confunda registros de catálogo, semelhanças temáticas ou metadados acadêmicos com evidência de leitura, admiração, preferência ou influência.
- Não invente títulos, citações, entrevistas, relações ou links.
- Classifique como "preferência declarada" ou "referência documentada" SOMENTE se houver prova explícita no dossiê. Na dúvida, use "afinidade crítica" ou "contexto literário" e explique que a relação é curatorial.
- Separe a evidência sobre o AUTOR recomendado da evidência sobre o LIVRO específico. Uma referência a Nietzsche, por exemplo, não comprova a leitura de Genealogia da moral.
- Selecione menos de 10 livros quando necessário; verifique com cautela autores e títulos.
- Utilize somente URLs fornecidas no dossiê. Deixe source_url vazio quando nenhuma fonte comprovar a relação. Não atribua à fonte o que ela não demonstra.
- A versão gratuita não realiza busca web em tempo real; declare essa limitação.
- Responda em português brasileiro. Retorne SOMENTE JSON válido.

FORMATO (preserve todos os campos):
{
  "author": "Nome pesquisado",
  "title": "Biblioteca de referência — Nome",
  "introduction": "Introdução e limites",
  "books": [
    {
      "author": "Outro autor",
      "title": "Livro",
      "evidence_type": "contexto literário",
      "role": "Função na biblioteca",
      "connection": "Conexão e seus limites",
      "reading_value": "O que observar",
      "related_work": "Obra do escritor pesquisado relacionada, se pertinente",
      "author_evidence": "O que está comprovado sobre a relação com o autor recomendado, ou não documentado",
      "book_evidence": "O que está comprovado sobre o livro específico, ou escolha curatorial",
      "evidence_note": "Distinção entre prova e interpretação",
      "source_url": ""
    }
  ],
  "reading_path": "Percurso sugerido",
  "sources": [
    {
      "title": "Fonte",
      "url": "URL exata do dossiê",
      "description": "O que sustenta de fato"
    }
  ],
  "method_note": "Fontes, limites e critérios"
}
`;

const json = (data, status = 200) =>
  Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" }
  });

const delay = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

async function safeJson(url) {
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(4500)
    });

    if (
      !response.ok ||
      !(response.headers.get("content-type") || "").includes("json")
    ) {
      return null;
    }

    return await response.json();
  } catch {
    return null;
  }
}

async function buildDossier(author) {
  const q = encodeURIComponent(author);

  const [wiki, books, works] = await Promise.all([
    safeJson(
      `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${q}&gsrlimit=4&prop=extracts|info&exintro=1&explaintext=1&inprop=url&format=json`
    ),

    safeJson(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(`inauthor:${author}`)}&maxResults=7&printType=books`
    ),

    safeJson(
      `https://api.openalex.org/works?search=${q}&per-page=6&select=id,doi,title,publication_year,authorships,abstract_inverted_index,primary_location`
    )
  ]);

  const sources = [];

  for (const page of Object.values(wiki?.query?.pages || {})) {
    if (page.extract) {
      sources.push({
        type: "context_page",
        title: page.title,
        url:
          page.fullurl ||
          `https://en.wikipedia.org/wiki/${encodeURIComponent(
            page.title.replaceAll(" ", "_")
          )}`,
        excerpt: page.extract.slice(0, 1600)
      });
    }
  }

  for (const item of books?.items || []) {
    const info = item.volumeInfo || {};

    sources.push({
      type: "book_catalog_record",
      title: info.title || "Sem título",
      authors: info.authors || [],
      description: (info.description || "").slice(0, 500),
      url:
        info.infoLink ||
        `https://books.google.com/books?id=${encodeURIComponent(
          item.id || ""
        )}`
    });
  }

  for (const work of works?.results || []) {
    const words = [];

    for (const [word, positions] of Object.entries(
      work.abstract_inverted_index || {}
    )) {
      for (const pos of positions) {
        if (pos < 250) words[pos] = word;
      }
    }

    sources.push({
      type: "academic_metadata",
      title: work.title || "Sem título",
      authors: (work.authorships || [])
        .map(a => a.author?.display_name)
        .filter(Boolean),
      abstract: words.join(" ").slice(0, 900),
      url:
        work.doi ||
        work.primary_location?.landing_page_url ||
        work.id
    });
  }

  return sources.slice(0, 17);
}

async function callGemini(model, apiKey, prompt) {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  for (let attempt = 0; attempt < 2; attempt++) {
    let response;

    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: SYSTEM_PROMPT }]
          },
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.2,
            maxOutputTokens: 3500
          }
        }),
        signal: AbortSignal.timeout(11000)
      });
    } catch (error) {
      if (attempt === 0) {
        await delay(400);
        continue;
      }

      throw new Error("TIMEOUT");
    }

    const type =
      response.headers.get("content-type") || "";

    if (!type.includes("json")) {
      throw new Error(
        `UPSTREAM_HTML_${response.status}`
      );
    }

    let data;

    try {
      data = await response.json();
    } catch {
      throw new Error("UPSTREAM_INVALID_JSON");
    }

    if (!response.ok) {
      const detail =
        data?.error?.message || "Falha na API Gemini";

      if (
        [429, 500, 502, 503, 504].includes(response.status) &&
        attempt === 0
      ) {
        await delay(700);
        continue;
      }

      const err = new Error(detail);
      err.httpStatus = response.status;
      throw err;
    }

    return data;
  }

  throw new Error(
    "Serviço temporariamente indisponível"
  );
}

export default async (req) => {
  if (req.method !== "POST") {
    return json(
      { error: "Use POST para pesquisar um autor." },
      405
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const model = (process.env.GEMINI_MODEL || "").trim();

  if (!apiKey) {
    return json({
      error: "GEMINI_API_KEY não configurada na Netlify."
    }, 503);
  }

  if (!model) {
    return json({
      error: "GEMINI_MODEL não configurado na Netlify."
    }, 503);
  }

  let body;

  try {
    body = await req.json();
  } catch {
    return json({
      error: "Pedido inválido."
    }, 400);
  }

  const author =
    typeof body?.author === "string"
      ? body.author.trim().slice(0, 120)
      : "";

  if (!author) {
    return json({
      error: "Informe o nome de um autor."
    }, 400);
  }

  try {
    const dossier = await buildDossier(author);

    const prompt = `
AUTOR SOLICITADO: ${author}

DOSSIÊ DE FONTES ABERTAS:
${JSON.stringify(dossier)}

Recomende exclusivamente livros de OUTROS autores.

Não inclua obras do próprio escritor nem coautorias.

Os registros de catálogo listam principalmente obras
do autor pesquisado e NÃO devem ser recomendados:
servem apenas como contexto.

Não trate catálogo como prova de influência.
Não invente fontes.

Separe author_evidence de book_evidence.

Use até 10 livros, preferindo menos quando
não houver evidência.
`;

    const raw = await callGemini(
      model,
      apiKey,
      prompt
    );

    const outputText =
      raw?.candidates?.[0]?.content?.parts
        ?.map(p => p.text || "")
        .join("\n")
        .trim();

    if (!outputText) {
      return json({
        error:
          "O Gemini não retornou conteúdo. Tente novamente."
      }, 502);
    }

    let parsed;

    try {
      parsed = JSON.parse(outputText);
    } catch {
      return json({
        error:
          "O Gemini retornou JSON incompleto. Tente novamente."
      }, 502);
    }

    if (
      !parsed ||
      typeof parsed !== "object" ||
      Array.isArray(parsed)
    ) {
      return json({
        error: "Formato de resposta inesperado."
      }, 502);
    }

    const allowedUrls = new Set(
      dossier.map(s => s.url).filter(Boolean)
    );

    const normalize = (value) =>
      String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    const targetName = normalize(author);

    const targetParts =
      targetName.split(" ").filter(Boolean);

    const isTargetAuthor = (name) => {
      const n = normalize(name);

      if (!n) return false;

      if (
        n === targetName ||
        n.includes(targetName)
      ) {
        return true;
      }

      const parts = n.split(" ");

      return (
        targetParts.length >= 2 &&
        targetParts.every(part => parts.includes(part))
      );
    };

    const allowedTypes = new Set([
      "preferência declarada",
      "referência documentada",
      "afinidade crítica",
      "contexto literário"
    ]);

    parsed.books = Array.isArray(parsed.books)
      ? parsed.books
          .filter(
            book =>
              book &&
              typeof book === "object" &&
              typeof book.title === "string" &&
              typeof book.author === "string"
          )
          .filter(
            book =>
              !String(book.author)
                .split(/[,;]|\s+e\s+|\s+and\s+/i)
                .some(isTargetAuthor)
          )
          .slice(0, 10)
          .map(book => ({
            ...book,
            evidence_type:
              allowedTypes.has(book.evidence_type)
                ? book.evidence_type
                : "contexto literário",
            related_work: String(
              book.related_work || ""
            ),
            author_evidence: String(
              book.author_evidence ||
              "Não documentado no dossiê."
            ),
            book_evidence: String(
              book.book_evidence ||
              "Título escolhido pela curadoria; leitura específica não comprovada."
            ),
            evidence_note: String(
              book.evidence_note ||
              "Relação sujeita aos limites do dossiê."
            ),
            source_url:
              allowedUrls.has(book.source_url)
                ? book.source_url
                : ""
          }))
      : [];

    parsed.sources = Array.isArray(parsed.sources)
      ? parsed.sources
          .filter(s => allowedUrls.has(s?.url))
          .slice(0, 17)
      : [];

    return json(parsed);

  } catch (error) {
    if (error.message === "TIMEOUT") {
      return json({
        error:
          "A resposta do Gemini demorou demais. Aguarde um pouco e tente novamente."
      }, 504);
    }

    if (
      error.message.startsWith("UPSTREAM_HTML_") ||
      error.message === "UPSTREAM_INVALID_JSON"
    ) {
      return json({
        error:
          "O serviço Gemini devolveu uma resposta inesperada. Tente novamente mais tarde."
      }, 502);
    }

    if (error.httpStatus === 429) {
      return json({
        error:
          "O limite gratuito do Gemini foi atingido. Aguarde antes de tentar novamente."
      }, 429);
    }

    if (
      [500, 502, 503, 504].includes(
        error.httpStatus
      )
    ) {
      return json({
        error:
          "O Gemini está temporariamente indisponível. Aguarde alguns minutos e tente novamente."
      }, 503);
    }

    if (
      [400, 404].includes(error.httpStatus)
    ) {
      return json({
        error:
          `O modelo configurado (${model}) não foi aceito pela API Gemini. Verifique GEMINI_MODEL no Google AI Studio.`
      }, 502);
    }

    if (
      [401, 403].includes(error.httpStatus)
    ) {
      return json({
        error:
          "A API Gemini recusou a autenticação ou o acesso. Verifique a chave e as permissões no Google AI Studio."
      }, 502);
    }

    return json({
      error:
        "Falha ao gerar a biblioteca. Tente novamente ou verifique a configuração do Gemini."
    }, 500);
  }
};
