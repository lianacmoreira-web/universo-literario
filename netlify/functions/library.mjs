const SYSTEM_PROMPT = `
Você é o Literary Universe — Reference Library, pesquisador e curador literário.

Crie uma biblioteca de até 10 livros para compreender o universo literário, intelectual, estético, temático, histórico e intertextual de um escritor.

REGRAS:
- Utilize o dossiê fornecido pelo servidor.
- Não invente livros, entrevistas, fontes, preferências ou influências.
- Metadados bibliográficos não comprovam influência literária.
- Diferencie rigorosamente:
  "preferência declarada",
  "referência documentada",
  "afinidade crítica",
  "contexto literário".
- Use "preferência declarada" apenas com evidência explícita.
- Se as fontes forem insuficientes, selecione menos livros.
- Não invente URLs.
- Responda em português brasileiro.
- Retorne somente JSON válido.

FORMATO:
{
  "author": "Nome do autor",
  "title": "Biblioteca de referência",
  "introduction": "Apresentação da seleção",
  "books": [
    {
      "author": "Autor do livro",
      "title": "Título do livro",
      "evidence_type": "contexto literário",
      "role": "Função na biblioteca",
      "connection": "Relação com o escritor",
      "reading_value": "O que observar",
      "source_url": ""
    }
  ],
  "reading_path": "Percurso de leitura",
  "sources": [
    {
      "title": "Fonte",
      "url": "URL",
      "description": "O que a fonte comprova"
    }
  ],
  "method_note": "Limitações da pesquisa"
}
`;

const jsonHeaders = {
  "Content-Type": "application/json; charset=utf-8"
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: jsonHeaders
  });
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function safeJson(url) {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(4500),
      headers: {
        Accept: "application/json"
      }
    });

    if (!response.ok) return null;

    const type = response.headers.get("content-type") || "";

    if (!type.includes("json")) return null;

    return await response.json();
  } catch {
    return null;
  }
}

async function buildDossier(author) {
  const q = encodeURIComponent(author);

  const [wiki, books, works] = await Promise.all([
    safeJson(
      `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${q}&gsrlimit=3&prop=extracts|info&exintro=1&explaintext=1&inprop=url&format=json`
    ),

    safeJson(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent("inauthor:" + author)}&maxResults=6`
    ),

    safeJson(
      `https://api.openalex.org/works?search=${q}&per-page=6&select=id,doi,title,publication_year,authorships,primary_location`
    )
  ]);

  const sources = [];

  for (const page of Object.values(wiki?.query?.pages || {})) {
    if (!page.extract) continue;

    sources.push({
      type: "context_page",
      title: page.title,
      url: page.fullurl ||
        `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title.replaceAll(" ", "_"))}`,
      excerpt: page.extract.slice(0, 1800)
    });
  }

  for (const item of books?.items || []) {
    const info = item.volumeInfo || {};

    sources.push({
      type: "book_catalog_record",
      title: info.title || "Sem título",
      authors: info.authors || [],
      description: (info.description || "").slice(0, 600),
      url: info.infoLink ||
        `https://books.google.com/books?id=${encodeURIComponent(item.id)}`
    });
  }

  for (const work of works?.results || []) {
    sources.push({
      type: "academic_metadata",
      title: work.title || "Sem título",
      year: work.publication_year || "",
      url: work.doi ||
        work.primary_location?.landing_page_url ||
        work.id
    });
  }

  return sources.slice(0, 15);
}

async function callGemini(apiKey, model, prompt) {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  const requestBody = {
    systemInstruction: {
      parts: [{ text: SYSTEM_PROMPT }]
    },
    contents: [{
      role: "user",
      parts: [{ text: prompt }]
    }],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.25,
      maxOutputTokens: 5000
    }
  };

  let lastError = "O serviço Gemini não respondeu.";

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(12000)
      });

      const contentType =
        response.headers.get("content-type") || "";

      const responseText = await response.text();

      if (!contentType.includes("json")) {
        throw new Error(
          "O serviço de IA retornou uma resposta inesperada."
        );
      }

      let data;

      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(
          "Não foi possível interpretar a resposta do Gemini."
        );
      }

      if (!response.ok) {
        const detail =
          data?.error?.message || "Erro desconhecido.";

        if ([429, 500, 502, 503, 504].includes(response.status)) {
          lastError = `Gemini temporariamente indisponível: ${detail}`;

          if (attempt === 0) {
            await wait(1000);
            continue;
          }
        }

        if (response.status === 404) {
          throw new Error(
            `Modelo Gemini não encontrado: ${model}. Verifique GEMINI_MODEL na Netlify.`
          );
        }

        if ([400, 401, 403].includes(response.status)) {
          throw new Error(
            `Erro de configuração ou acesso ao Gemini: ${detail}`
          );
        }

        throw new Error(lastError ===
          "O serviço Gemini não respondeu."
          ? detail
          : lastError
        );
      }

      const text = data?.candidates?.[0]?.content?.parts
        ?.map(part => part.text || "")
        .join("")
        .trim();

      if (!text) {
        throw new Error(
          "O Gemini retornou uma resposta vazia."
        );
      }

      try {
        return JSON.parse(text);
      } catch {
        throw new Error(
          "O Gemini não retornou uma biblioteca em JSON válido."
        );
      }

    } catch (error) {
      lastError = error.message || "Erro desconhecido.";

      if (error.name === "TimeoutError" ||
          error.name === "AbortError") {
        lastError = "O Gemini demorou demais para responder.";

        if (attempt === 0) {
          await wait(1000);
          continue;
        }
      }

      throw new Error(lastError);
    }
  }

  throw new Error(lastError);
}

export default async function handler(req) {
  if (req.method !== "POST") {
    return jsonResponse(
      { error: "Método não permitido. Use POST." },
      405
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;

  const model =
    process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";

  if (!apiKey) {
    return jsonResponse({
      error: "A chave Gemini não está configurada na Netlify."
    }, 503);
  }

  let body;

  try {
    body = await req.json();
  } catch {
    return jsonResponse({
      error: "Pedido inválido."
    }, 400);
  }

  const author = String(body?.author || "")
    .trim()
    .slice(0, 120);

  if (!author) {
    return jsonResponse({
      error: "Informe o nome de um escritor."
    }, 400);
  }

  try {
    const dossier = await buildDossier(author);

    const prompt = `
AUTOR SOLICITADO:
${author}

DOSSIÊ DE FONTES ABERTAS:
${JSON.stringify(dossier)}

Crie uma biblioteca de referência com até 10 livros.

Use somente URLs presentes no dossiê.
Não confunda catálogo bibliográfico com prova de influência.
Se não houver evidência suficiente, explicite os limites.
`;

    const result = await callGemini(
      apiKey,
      model,
      prompt
    );

    const allowedUrls = new Set(
      dossier.map(item => item.url).filter(Boolean)
    );

    const allowedTypes = new Set([
      "preferência declarada",
      "referência documentada",
      "afinidade crítica",
      "contexto literário"
    ]);

    result.books = Array.isArray(result.books)
      ? result.books.slice(0, 10).map(book => ({
          ...book,
          evidence_type: allowedTypes.has(book.evidence_type)
            ? book.evidence_type
            : "contexto literário",
          source_url: allowedUrls.has(book.source_url)
            ? book.source_url
            : ""
        }))
      : [];

    result.sources = Array.isArray(result.sources)
      ? result.sources
          .filter(source => allowedUrls.has(source.url))
          .slice(0, 15)
      : [];

    return jsonResponse(result);

  } catch (error) {
    console.error(
      "Literary Universe:",
      error.message
    );

    return jsonResponse({
      error:
        error.message ||
        "Não foi possível concluir a pesquisa."
    }, 502);
  }
}
