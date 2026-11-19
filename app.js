
/*
 * LITERARY UNIVERSE 4.0
 * GENEALOGIAS POÉTICAS
 *
 * Netlify Function
 *
 * Objetivo:
 * Construir genealogias de leitura para poetas.
 *
 * Duas listas:
 * 1. reference_books: relações documentadas
 * 2. literary_connections: genealogia interpretativa
 *
 * Serviços:
 * - Gemini
 * - Open Library
 * - Google Books
 *
 * Não exige bibliotecas npm adicionais.
 */

const VERSION = "4.0";

const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models";

const MAX_CONNECTIONS = 10;
const MAX_DOCUMENTED = 10;

const sleep = ms =>
  new Promise(resolve => setTimeout(resolve, ms));

function clean(value, max = 2000) {
  return String(value ?? "").trim().slice(0, max);
}

function normalize(value) {
  return clean(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function words(value) {
  return normalize(value)
    .split(" ")
    .filter(word => word.length > 2);
}

function response(data, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store"
    }
  });
}

function validUrl(value) {
  try {
    const url = new URL(value);

    return url.protocol === "https:"
      ? url.href
      : null;
  } catch {
    return null;
  }
}

function sameWriter(a, b) {
  const first = words(a);
  const second = words(b);

  if (!first.length || !second.length) {
    return false;
  }

  return (
    first.every(word => second.includes(word)) ||
    second.every(word => first.includes(word))
  );
}

function uniqueBooks(items) {
  const seen = new Set();

  return items.filter(book => {
    const key =
      normalize(book.author) + "|" +
      normalize(book.title);

    if (!normalize(book.author) ||
        !normalize(book.title) ||
        seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

async function getJson(url, timeout = 4000) {
  try {
    const result = await fetch(url, {
      headers: {
        Accept: "application/json"
      },
      signal: AbortSignal.timeout(timeout)
    });

    if (!result.ok) return null;

    return await result.json();
  } catch {
    return null;
  }
}

/*
 * CONTEXTO LITERÁRIO
 *
 * Recupera informações básicas do poeta.
 * Essas fontes NÃO comprovam influências.
 */

async function getPoetContext(author) {
  const query = encodeURIComponent(author);

  const url =
    "https://pt.wikipedia.org/w/api.php" +
    "?action=query" +
    "&generator=search" +
    "&gsrsearch=" + query +
    "&gsrlimit=3" +
    "&prop=extracts" +
    "&exintro=1" +
    "&explaintext=1" +
    "&format=json";

  const data = await getJson(url);

  const pages = Object.values(
    data?.query?.pages || {}
  );

  const lastName = words(author).at(-1);

  return pages
    .filter(page => {
      return page.extract &&
        words(page.title).includes(lastName);
    })
    .map(page => ({
      title: clean(page.title, 150),
      excerpt: clean(page.extract, 1600)
    }))
    .slice(0, 2);
}

/*
 * INSTRUÇÕES DE CURADORIA
 *
 * O objetivo não é reunir associações genéricas.
 * É construir uma genealogia poética.
 */

const SYSTEM_PROMPT = `
Você é um pesquisador de poesia, crítico literário
e curador de bibliotecas poéticas.

Sua especialidade é construir GENEALOGIAS POÉTICAS.

Uma genealogia poética é uma constelação de obras
que permite compreender os procedimentos formais,
estéticos e intelectuais de um poeta.

Ela NÃO é necessariamente uma genealogia de
influências históricas comprovadas.

Responda em português brasileiro.

TAREFA

Receba o nome de um poeta e construa uma biblioteca
de leitura comparada.

ETAPA INTELECTUAL 1 — PERFIL POÉTICO

Antes de escolher livros, identifique:

- obras centrais do poeta;
- procedimentos de linguagem;
- formas de construção da imagem;
- relações com objetos e cotidiano;
- percepção, memória e espaço;
- voz, ritmo, sintaxe e composição;
- tradições poéticas relevantes;
- tensões estéticas particulares.

Não reduza o poeta a temas genéricos.

ETAPA INTELECTUAL 2 — GENEALOGIA

Selecione de 7 a 10 livros de OUTROS autores.

Priorize livros de poesia, poéticas e obras
literárias fundamentais para compreender
a escrita do poeta pesquisado.

Ensaios e teoria podem entrar apenas quando
oferecerem uma conexão especialmente relevante.

Cada livro deve responder à pergunta:

"O que este livro permite perceber, com maior
precisão, na obra do poeta pesquisado?"

Valorize relações como:

- objeto e linguagem;
- cotidiano e estranhamento;
- imagem e percepção;
- silêncio e elipse;
- materialidade da palavra;
- fragmentação e montagem;
- memória e tempo;
- espaço e paisagem;
- ritmo e sintaxe;
- tradição e ruptura;
- formas de atenção;
- metapoesia;
- voz e subjetividade.

Esses são exemplos, não uma lista obrigatória.

CRITÉRIOS DE QUALIDADE

1. Evite recomendações genéricas.
2. Prefira conexões entre obras específicas.
3. Explique o PROCEDIMENTO POÉTICO compartilhado.
4. Diferencie semelhanças e contrastes.
5. Não escolha dez livros pelo mesmo motivo.
6. Inclua autores brasileiros e estrangeiros
   quando isso enriquecer a genealogia.
7. Não invente títulos ou obras.
8. Não invente versos, entrevistas ou citações.
9. Não apresente afinidades como influências.
10. Não inclua livros do próprio poeta pesquisado.
11. Não confunda popularidade com relevância.
12. Não afirme que o poeta leu um livro sem prova.
13. Não invente fontes ou URLs.
14. Evite repetir autores, salvo quando dois
    livros oferecerem conexões muito distintas.

ETAPA INTELECTUAL 3 — RELAÇÕES DOCUMENTADAS

Produza separadamente a lista "documented".

Ela é reservada a livros cuja preferência
ou influência específica esteja documentada.

Somente inclua um livro se houver uma fonte
confiável, identificável e específica.

Se não houver evidência suficiente, retorne [].

Uma semelhança temática NÃO é evidência.
Um catálogo bibliográfico NÃO é evidência.
A simples menção conjunta NÃO é evidência.

Não invente URLs.

ATENÇÃO: a existência de uma URL mencionada
pelo modelo não significa que ela foi verificada.

FORMATO JSON OBRIGATÓRIO

{
  "poetic_profile": {
    "central_works": [],
    "formal_features": [],
    "central_questions": [],
    "traditions": []
  },
  "introduction": "",
  "documented": [
    {
      "author": "",
      "title": "",
      "relationship": "preferência declarada",
      "evidence_note": "",
      "evidence_source_url": ""
    }
  ],
  "connections": [
    {
      "author": "",
      "title": "",
      "related_work": "",
      "connection": "",
      "reading_value": "",
      "genealogy_axis": "",
      "evidence_type": "afinidade interpretativa"
    }
  ]
}

ORIENTAÇÕES DE ESCRITA

A introdução deve apresentar a poética do
escritor em um parágrafo substantivo.

Cada "connection" deve conter de 3 a 5 frases.

Explique uma relação formal ou estética
identificável, não apenas um tema comum.

O campo "related_work" deve indicar uma obra
real do poeta pesquisado.

O campo "reading_value" deve orientar
concretamente o leitor.

O campo "genealogy_axis" deve nomear
o eixo poético da conexão em poucas palavras.

A lista "connections" deve conter
preferencialmente 7 a 10 livros.

Não escreva Markdown fora do JSON.
`;

/*
 * GEMINI
 *
 * Uma única solicitação principal, com
 * tentativas automáticas em erros transitórios.
 */

function isTransient(status, message = "") {
  return (
    [429, 500, 502, 503, 504, 529].includes(status) ||
    /high demand|overload|temporar|unavailable|try again later/i
      .test(message)
  );
}

async function callGemini(author, context) {
  const apiKey = process.env.GEMINI_API_KEY;

  const model = clean(
    process.env.GEMINI_MODEL ||
    "gemini-2.5-flash",
    100
  );

  if (!apiKey) {
    throw Object.assign(
      new Error("GEMINI_API_KEY não configurada."),
      { status: 503 }
    );
  }

  const url =
    GEMINI_ENDPOINT +
    "/" +
    encodeURIComponent(model) +
    ":generateContent";

  const userPrompt = `
POETA PESQUISADO: ${author}

CONTEXTO BIOGRÁFICO AUXILIAR:
${JSON.stringify(context).slice(0, 4500)}

Construa uma genealogia poética de alta qualidade.

Primeiro caracterize a poética do escritor.
Depois selecione os livros em função dessa poética.

A seleção deve ter unidade intelectual,
mas também diversidade de procedimentos.

Não confunda uma genealogia interpretativa
com uma relação histórica de influência.
`;

  const body = JSON.stringify({
    systemInstruction: {
      parts: [
        { text: SYSTEM_PROMPT }
      ]
    },
    contents: [
      {
        role: "user",
        parts: [
          { text: userPrompt }
        ]
      }
    ],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.45,
      maxOutputTokens: 8000
    }
  });

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const result = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body,
        signal: AbortSignal.timeout(22000)
      });

      const data = await result.json().catch(() => null);

      if (!result.ok) {
        const message =
          data?.error?.message ||
          `Gemini HTTP ${result.status}`;

        if (
          isTransient(result.status, message) &&
          attempt < 3
        ) {
          console.warn(
            `Gemini: tentativa ${attempt}/3 falhou: ${message}`
          );

          await sleep(attempt * 1200);
          continue;
        }

        throw Object.assign(
          new Error(message),
          {
            status: result.status,
            transient: isTransient(
              result.status,
              message
            )
          }
        );
      }

      const text = (
        data?.candidates?.[0]?.content?.parts || []
      )
        .map(part => part.text || "")
        .join("");

      if (!text) {
        throw new Error(
          "O Gemini retornou uma resposta vazia."
        );
      }

      return JSON.parse(text);

    } catch (error) {
      const timeout =
        error.name === "TimeoutError" ||
        error.name === "AbortError";

      if (timeout && attempt < 3) {
        await sleep(attempt * 1200);
        continue;
      }

      if (timeout) {
        throw Object.assign(
          new Error("Tempo limite do Gemini excedido."),
          { transient: true }
        );
      }

      throw error;
    }
  }
}

/*
 * METADADOS BIBLIOGRÁFICOS
 *
 * Os catálogos ajudam a localizar livros
 * e capas. Não provam influência literária.
 */

function plausibleTitle(expected, found) {
  const a = normalize(expected);
  const b = normalize(found);

  if (!a || !b) return false;
  if (a === b) return true;

  const first = words(expected);
  const second = new Set(words(found));

  if (first.length < 2) return false;

  const matches = first.filter(
    word => second.has(word)
  ).length;

  return (
    matches / first.length >= 0.8 &&
    Math.abs(a.length - b.length) < 35
  );
}

function plausibleAuthor(expected, found) {
  const a = words(expected);
  const b = words(found);

  if (!a.length || !b.length) return false;

  return (
    b.includes(a.at(-1)) &&
    a.some(word => b.includes(word))
  );
}

function emptyMetadata() {
  return {
    cover_url: null,
    bibliographic_source_url: null,
    first_publication_year: null,
    publisher: null,
    edition: null,
    genre: null,
    synopsis: null
  };
}

async function bookMetadata(book) {
  const empty = emptyMetadata();

  const query = new URLSearchParams({
    title: clean(book.title, 150),
    author: clean(book.author, 120),
    limit: "6"
  });

  const googleQuery = encodeURIComponent(
    "intitle:" + book.title +
    " inauthor:" + book.author
  );

  const [openLibrary, googleBooks] =
    await Promise.all([
      getJson(
        "https://openlibrary.org/search.json?" +
        query.toString(),
        4000
      ),
      getJson(
        "https://www.googleapis.com/books/v1/volumes" +
        "?q=" + googleQuery +
        "&maxResults=6",
        4000
      )
    ]);

  const openMatch = (
    openLibrary?.docs || []
  ).find(item => {
    return (
      plausibleTitle(book.title, item.title) &&
      (item.author_name || []).some(name =>
        plausibleAuthor(book.author, name)
      )
    );
  });

  const googleMatch = (
    googleBooks?.items || []
  ).find(item => {
    const info = item.volumeInfo || {};

    return (
      plausibleTitle(book.title, info.title) &&
      (info.authors || []).some(name =>
        plausibleAuthor(book.author, name)
      )
    );
  });

  if (!openMatch && !googleMatch) {
    return empty;
  }

  const info = googleMatch?.volumeInfo || {};

  const openCover = openMatch?.cover_i
    ? "https://covers.openlibrary.org/b/id/" +
      openMatch.cover_i +
      "-M.jpg"
    : null;

  const googleCover = info.imageLinks?.thumbnail
    ?.replace(/^http:/, "https:") || null;

  const openUrl = openMatch?.key
    ? "https://openlibrary.org" + openMatch.key
    : null;

  return {
    cover_url:
      openCover || googleCover || null,

    bibliographic_source_url:
      openUrl ||
      validUrl(info.infoLink) ||
      null,

    first_publication_year:
      openMatch?.first_publish_year ||
      null,

    publisher:
      openMatch?.publisher?.[0] ||
      info.publisher ||
      null,

    edition: null,

    genre:
      info.categories?.[0] ||
      openMatch?.subject?.[0] ||
      null,

    synopsis:
      typeof info.description === "string"
        ? clean(info.description, 650)
        : null
  };
}

/*
 * RELAÇÕES DOCUMENTADAS
 *
 * Nesta versão, não promovemos alegações
 * geradas pelo modelo a fatos documentados.
 *
 * A lista documental deve ser alimentada
 * futuramente por um acervo de fontes
 * primárias verificadas.
 */

function verifiedDocumentedBooks() {
  return [];
}

/*
 * CURADORIA FINAL
 */

async function buildLibrary(author, raw) {
  const candidates = Array.isArray(raw.connections)
    ? raw.connections
    : [];

  const filtered = uniqueBooks(
    candidates.filter(book => {
      if (!book || !book.author || !book.title) {
        return false;
      }

      if (sameWriter(book.author, author)) {
        return false;
      }

      return clean(book.connection).length >= 70;
    })
  ).slice(0, MAX_CONNECTIONS);

  const metadata = await Promise.all(
    filtered.map(book => bookMetadata(book))
  );

  const connections = filtered.map((book, index) => {
    const meta = metadata[index];

    return {
      author: clean(book.author, 150),
      title: clean(book.title, 200),

      role: "Genealogia poética",

      related_work: clean(
        book.related_work,
        200
      ),

      genealogy_axis: clean(
        book.genealogy_axis,
        150
      ),

      connection: clean(
        book.connection,
        1600
      ),

      reading_value: clean(
        book.reading_value,
        700
      ),

      evidence_type:
        "afinidade interpretativa",

      evidence_note:
        "Conexão de leitura comparada. " +
        "Não constitui prova de influência.",

      ...meta
    };
  });

  const documented =
    verifiedDocumentedBooks(author)
      .slice(0, MAX_DOCUMENTED);

  const sources = [];

  for (const book of connections) {
    if (book.bibliographic_source_url) {
      sources.push({
        title:
          "Registro bibliográfico — " +
          book.title,

        url: book.bibliographic_source_url,

        description:
          "Identificação bibliográfica. " +
          "Não comprova influência."
      });
    }
  }

  const uniqueSources = [
    ...new Map(
      sources.map(source => [
        source.url,
        source
      ])
    ).values()
  ];

  const profile = raw.poetic_profile || {};

  const profileLines = [
    ...(Array.isArray(profile.formal_features)
      ? profile.formal_features
      : []),

    ...(Array.isArray(profile.central_questions)
      ? profile.central_questions
      : [])
  ]
    .map(item => clean(item, 160))
    .filter(Boolean)
    .slice(0, 8);

  const readingPath = connections.map(
    (book, index) =>
      `${index + 1}. ${book.title} — ${book.author}.`
  ).join("\n");

  return {
    version: VERSION,

    author,

    title:
      "Genealogia poética — " + author,

    introduction: clean(
      raw.introduction,
      1500
    ),

    poetic_profile: {
      central_works:
        Array.isArray(profile.central_works)
          ? profile.central_works
          : [],

      formal_features:
        Array.isArray(profile.formal_features)
          ? profile.formal_features
          : [],

      central_questions:
        Array.isArray(profile.central_questions)
          ? profile.central_questions
          : [],

      traditions:
        Array.isArray(profile.traditions)
          ? profile.traditions
          : []
    },

    poetic_axes: profileLines,

    reference_books: documented,

    literary_connections: connections,

    // Compatibilidade com interfaces antigas.
    books: connections,

    reading_path: readingPath,

    sources: uniqueSources,

    method_note:
      "Esta biblioteca propõe uma genealogia " +
      "poética interpretativa, não uma cadeia " +
      "de influências comprovadas. " +
      "A lista de preferências e influências " +
      "documentadas permanece vazia até que " +
      "fontes específicas sejam verificadas. " +
      "Os registros bibliográficos ajudam a " +
      "identificar livros e capas, mas não " +
      "demonstram relações literárias. " +
      "As datas, editoras e capas podem " +
      "corresponder a registros de edições " +
      "diferentes e devem ser conferidas."
  };
}

/*
 * NETLIFY HANDLER
 */

export default async function handler(req) {
  if (req.method !== "POST") {
    return response(
      { error: "Use POST." },
      405
    );
  }

  let input;

  try {
    input = await req.json();
  } catch {
    return response(
      { error: "Pedido inválido." },
      400
    );
  }

  const author = clean(input?.author, 120);

  if (!author) {
    return response(
      { error: "Informe o nome de um poeta." },
      400
    );
  }

  try {
    console.log(
      `Literary Universe ${VERSION}: ${author}`
    );

    const context =
      await getPoetContext(author);

    const raw =
      await callGemini(author, context);

    const library =
      await buildLibrary(author, raw);

    if (!library.literary_connections.length) {
      return response(
        {
          error:
            "Não foi possível construir uma " +
            "genealogia poética consistente. " +
            "Confira o nome do poeta e tente novamente."
        },
        422
      );
    }

    return response(library);

  } catch (error) {
    console.error(
      `Literary Universe ${VERSION}:`,
      error.message
    );

    if (error.transient) {
      return response(
        {
          error:
            "O Gemini está temporariamente " +
            "sobrecarregado. Aguarde alguns " +
            "minutos e tente novamente."
        },
        503
      );
    }

    if (error.status === 429) {
      return response(
        {
          error:
            "Limite de solicitações do Gemini " +
            "atingido. Tente novamente mais tarde."
        },
        429
      );
    }

    if (
      error.status === 400 ||
      error.status === 404
    ) {
      return response(
        {
          error:
            "O modelo Gemini configurado não " +
            "está disponível. Verifique GEMINI_MODEL."
        },
        502
      );
    }

    if (
      error.status === 401 ||
      error.status === 403
    ) {
      return response(
        {
          error:
            "Falha de autenticação na API Gemini."
        },
        502
      );
    }

    return response(
      {
        error:
          "Falha na pesquisa. Consulte o log " +
          "da função library na Netlify."
      },
      503
    );
  }
}
