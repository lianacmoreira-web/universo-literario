
const NEXO = "https://www.nexojornal.com.br/estante-favoritos/2016/08/13/os-5-livros-favoritos-do-economista-eduardo-giannetti";

const tidy = (v, n = 2000) =>
  String(v ?? "").trim().slice(0, n);

const norm = v =>
  tidy(v)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const words = v =>
  norm(v).split(" ").filter(x => x.length > 2);

const json = (data, status = 200) =>
  Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" }
  });

const giannetti = name =>
  /\bgiann?etti\b/.test(norm(name)) &&
  (
    /eduardo/.test(norm(name)) ||
    ["giannetti", "gianetti"].includes(norm(name))
  );

const G = [
  [
    "Fiódor Dostoiévski",
    "Os irmãos Karamázov",
    "Formação e responsabilidade moral",
    "Autoengano",
    "A narrativa confronta os personagens com liberdade, culpa e responsabilidade. Uma leitura comparada com Autoengano permite investigar como as justificativas pessoais convivem com desejos e motivações contraditórios. A escolha do romance por Giannetti é documentada; a aproximação com seu ensaio é interpretação da curadoria.",
    "Observe as justificativas dos personagens e a tensão entre intenção, culpa e ação."
  ],
  [
    "David Hume",
    "Diálogos sobre a religião natural",
    "Ceticismo e limites do conhecimento",
    "A ilusão da alma",
    "Os interlocutores de Hume confrontam argumentos sobre os limites da razão e da crença. Em diálogo com A ilusão da alma, o livro ajuda a pensar a diferença entre experiência subjetiva e demonstração filosófica. A preferência de Giannetti pelo título é documentada; a relação específica entre as obras é interpretativa.",
    "Acompanhe como os argumentos são testados e como a forma dialogada preserva questões abertas."
  ],
  [
    "Friedrich Nietzsche",
    "Aurora",
    "Psicologia moral e valores",
    "Autoengano",
    "Aurora investiga a formação dos juízos morais e a opacidade das motivações. Essa perspectiva permite uma leitura comparada com Autoengano, que interroga as narrativas que fazemos de nós mesmos. A seleção do título por Giannetti é documentada, sem que isso prove influência causal sobre seu ensaio.",
    "Examine a diferença entre motivos declarados e explicações psicológicas da ação."
  ],
  [
    "Machado de Assis",
    "Dom Casmurro",
    "Memória e autointerpretação",
    "Autoengano",
    "O narrador de Dom Casmurro reconstrói o passado para convencer seu leitor. A obra permite pensar, ao lado de Autoengano, os limites da memória e a possibilidade de uma narrativa pessoal persuasiva, mas incompleta. A preferência pelo romance é documentada; a comparação é uma proposta crítica.",
    "Observe as lacunas do relato, os recursos de persuasão e o que permanece sem prova."
  ],
  [
    "Thomas Nagel",
    "The View from Nowhere",
    "Subjetividade e objetividade",
    "A ilusão da alma",
    "Nagel investiga a tensão entre o ponto de vista situado do sujeito e a aspiração à objetividade. Esse problema oferece uma chave comparativa para A ilusão da alma, especialmente nas questões de consciência e identidade. A seleção do livro por Giannetti é documentada; a conexão específica é interpretação curatorial.",
    "Compare a perspectiva em primeira pessoa e as exigências de uma descrição objetiva."
  ]
];

function giannettiLibrary() {
  return {
    author: "Eduardo Giannetti",
    title: "Biblioteca de referência — Eduardo Giannetti",
    introduction:
      "Cinco livros selecionados por Eduardo Giannetti em publicação do Nexo Jornal (2016). A preferência pelos títulos é documentada nessa seleção; as aproximações com seus ensaios são interpretações curatoriais e não provas de influência direta.",

    books: G.map(([
      author, title, role, related_work,
      connection, reading_value
    ]) => ({
      author,
      title,
      role,
      related_work,
      connection,
      reading_value,
      evidence_type: "preferência declarada",
      author_evidence:
        "O autor integra a seleção publicada pelo Nexo Jornal.",
      book_evidence:
        "O título específico integra a seleção publicada pelo Nexo Jornal.",
      evidence_note:
        "Preferência pelo título documentada; relação com o ensaio interpretativa.",
      source_url: NEXO
    })),

    reading_path: G.map(
      (b, i) => `${i + 1}. ${b[1]} — ${b[2]}.`
    ).join("\n"),

    sources: [{
      title:
        "Os 5 livros favoritos do economista Eduardo Giannetti — Nexo Jornal (2016)",
      url: NEXO,
      description:
        "Fonte documental da seleção dos cinco livros; não comprova as conexões interpretativas."
    }],

    method_note:
      "Dossiê documental preparado previamente. A fonte não é consultada novamente a cada pesquisa. A classificação de preferência declarada se refere aos livros; as conexões com a obra de Giannetti são interpretações."
  };
}

// FONTES ABERTAS

async function fetchJson(url, ms = 5500) {
  try {
    const r = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(ms)
    });

    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

async function context(author) {
  const search = encodeURIComponent(author);

  const jobs = [
    fetchJson(
      `https://pt.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${search}&gsrlimit=3&prop=extracts|info&exintro=1&explaintext=1&inprop=url&format=json`
    ),
    fetchJson(
      `https://openlibrary.org/search/authors.json?q=${search}&limit=6`
    ),
    fetchJson(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent("inauthor:" + author)}&maxResults=6`
    ),
    fetchJson(
      `https://api.openalex.org/works?search=${search}&per-page=6`
    )
  ];

  const [wiki, ol, gb, oa] = await Promise.all(jobs);
  const docs = [];

  for (const p of Object.values(wiki?.query?.pages || {})) {
    if (p.extract) {
      docs.push({
        kind: "contexto",
        title: p.title,
        url:
          p.fullurl ||
          `https://pt.wikipedia.org/wiki/${encodeURIComponent(p.title.replaceAll(" ", "_"))}`,
        excerpt: tidy(p.extract, 1100)
      });
    }
  }

  for (const a of ol?.docs || []) {
    if (norm(a.name) === norm(author)) {
      docs.push({
        kind: "registro_autor",
        title: a.name,
        url: `https://openlibrary.org${a.key}`,
        excerpt:
          `Catálogo: ${a.work_count || 0} registros de obras. Não comprova leituras ou influências.`
      });
    }
  }

  for (const b of gb?.items || []) {
    const v = b.volumeInfo || {};

    if ((v.authors || []).some(x => norm(x) === norm(author))) {
      docs.push({
        kind: "obra_do_pesquisado",
        title: v.title,
        url: v.infoLink || "",
        excerpt: tidy(v.description, 400)
      });
    }
  }

  for (const w of oa?.results || []) {
    if (w.title) {
      docs.push({
        kind: "metadado_academico",
        title: w.title,
        url: w.doi || w.id,
        excerpt:
          `Ano: ${w.publication_year || "não informado"}. A pertinência ao autor ainda não foi verificada.`
      });
    }
  }

  return docs.filter(d => d.url).slice(0, 16);
}

// GEMINI

const INSTRUCTION = `
Você é um curador bibliográfico acadêmico.
Responda SOMENTE JSON válido, em português brasileiro.

Selecione até 8 livros REAIS de OUTROS AUTORES,
nunca obras ou coautorias do escritor pesquisado.

O objetivo é sugerir leituras para compreender
o universo intelectual/literário do pesquisado.

Não afirme que o escritor leu, admirou ou foi
influenciado por um livro sem evidência primária
explícita sobre a relação.

Metadados e catálogos não são evidência de influência.
Não invente fontes nem URLs.

Use APENAS a categoria "afinidade crítica"
ou "contexto literário" nas propostas exploratórias.

Em cada conexão, indique um aspecto preciso
da obra do escritor pesquisado; não invente
títulos de obras dele.

Se não tiver certeza de um título, descreva
o tema sem nomear obra.

Cada conexão deve ter pelo menos 3 frases
substantivas; leitura orientada deve ter
pelo menos 1 frase.

Não alegue que "a crítica afirma" sem documento
que comprove.

Dê preferência a obras com título original
inequívoco, autoria conhecida e circulação
bibliográfica ampla.

Evite títulos vagos ou inventados.

Formato:
{
  "author": "",
  "introduction": "",
  "books": [
    {
      "author": "",
      "title": "",
      "role": "",
      "evidence_type": "afinidade crítica",
      "connection": "",
      "reading_value": "",
      "related_work": ""
    }
  ]
}

O sistema verificará os títulos em catálogos
e descartará aqueles que não conseguir identificar.

Não crie percurso nem bibliografia:
o servidor fará isso após validar os livros.
`;

async function generate(author, docs) {
  const key = process.env.GEMINI_API_KEY;
  const model = tidy(process.env.GEMINI_MODEL, 100);

  if (!key || !model) {
    throw Object.assign(
      new Error("Configuração GEMINI_API_KEY/GEMINI_MODEL ausente."),
      { status: 503 }
    );
  }

  const endpoint =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  const r = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": key
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: INSTRUCTION }]
      },
      contents: [{
        role: "user",
        parts: [{
          text:
            `Escritor pesquisado: ${author}\n` +
            `Contexto recuperado (não comprova relações): ` +
            JSON.stringify(docs).slice(0, 12000) +
            `\nSugira até 8 candidatos verificáveis; ` +
            `não invente relações documentadas.`
        }]
      }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2,
        maxOutputTokens: 6500
      }
    }),
    signal: AbortSignal.timeout(22000)
  });

  const data = await r.json().catch(() => null);

  if (!r.ok) {
    throw Object.assign(
      new Error(
        data?.error?.message || `Gemini HTTP ${r.status}`
      ),
      { status: r.status }
    );
  }

  const s = (
    data?.candidates?.[0]?.content?.parts || []
  ).map(p => p.text || "").join("");

  if (!s) {
    throw new Error("Resposta vazia do Gemini");
  }

  return JSON.parse(s);
}

// VERIFICAÇÃO BIBLIOGRÁFICA

function titleMatch(a, b) {
  const x = norm(a);
  const y = norm(b);

  if (!x || !y) return false;
  if (x === y) return true;

  const ax = words(a).filter(
    w => ![
      "the", "and", "dos", "das", "uma",
      "para", "with", "sobre"
    ].includes(w)
  );

  const by = new Set(words(b));

  return (
    ax.length >= 2 &&
    ax.filter(w => by.has(w)).length / ax.length >= 0.8 &&
    Math.abs(x.length - y.length) < 25
  );
}

function authorMatch(a, b) {
  const x = words(a);
  const y = new Set(words(b));

  return (
    x.length > 0 &&
    x[x.length - 1].length >= 4 &&
    y.has(x[x.length - 1]) &&
    x.some(w => y.has(w))
  );
}

async function verify(book) {
  const q = new URLSearchParams({
    title: tidy(book.title, 160),
    author: tidy(book.author, 140),
    limit: "12"
  });

  const [ol, gb] = await Promise.all([
    fetchJson(
      `https://openlibrary.org/search.json?${q}`,
      5000
    ),
    fetchJson(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent("intitle:" + book.title + " inauthor:" + book.author)}&maxResults=8`,
      5000
    )
  ]);

  for (const b of ol?.docs || []) {
    if (
      titleMatch(book.title, b.title) &&
      (b.author_name || []).some(
        a => authorMatch(book.author, a)
      )
    ) {
      return {
        url: `https://openlibrary.org${b.key}`,
        catalog: "Open Library",
        title: b.title
      };
    }
  }

  for (const b of gb?.items || []) {
    const v = b.volumeInfo || {};

    if (
      titleMatch(book.title, v.title) &&
      (v.authors || []).some(
        a => authorMatch(book.author, a)
      ) &&
      v.infoLink
    ) {
      return {
        url: v.infoLink,
        catalog: "Google Books",
        title: v.title
      };
    }
  }

  return null;
}

function ownAuthor(candidate, author) {
  const a = words(author);
  const b = words(candidate);

  if (!a.length || !b.length) return false;

  return (
    a.length >= 2 &&
    a.every(x => b.includes(x))
  );
}

async function curate(raw, author, docs) {
  const candidates = (
    Array.isArray(raw?.books) ? raw.books : []
  )
    .slice(0, 10)
    .filter(b =>
      b &&
      tidy(b.title) &&
      tidy(b.author) &&
      !ownAuthor(b.author, author)
    );

  const checks = await Promise.all(
    candidates.map(verify)
  );

  const books = [];
  const sources = [];
  const seen = new Set();

  for (let i = 0; i < candidates.length; i++) {
    const b = candidates[i];
    const v = checks[i];

    if (!v) continue;

    const id =
      norm(b.author) + "|" + norm(b.title);

    if (seen.has(id)) continue;

    const connection = tidy(
      b.connection, 2000
    );

    const reading = tidy(
      b.reading_value, 850
    );

    if (
      connection.length < 150 ||
      reading.length < 35
    ) {
      continue;
    }

    seen.add(id);

    books.push({
      author: tidy(b.author, 150),
      title: tidy(b.title, 200),
      role:
        tidy(b.role, 160) ||
        "Leitura comparada",
      related_work: tidy(
        b.related_work, 160
      ),
      connection,
      reading_value: reading,

      evidence_type:
        [
          "afinidade crítica",
          "contexto literário"
        ].includes(b.evidence_type)
          ? b.evidence_type
          : "afinidade crítica",

      author_evidence:
        "Não foi identificada evidência primária de preferência ou influência.",

      book_evidence:
        `Registro bibliográfico localizado em ${v.catalog}.`,

      evidence_note:
        "A identificação do livro foi conferida em catálogo. A conexão com o escritor é hipótese curatorial gerada com auxílio de IA, não relação documentada.",

      source_url: v.url
    });

    sources.push({
      title:
        `Registro bibliográfico — ${tidy(b.title, 150)}`,
      url: v.url,
      description:
        `${v.catalog}: confirma a identificação do livro; não comprova relação com ${author}.`
    });

    if (books.length === 6) break;
  }

  // O percurso é reconstruído exclusivamente
  // com os livros que passaram pela validação.
  const reading_path = books.map(
    (b, i) =>
      `${i + 1}. ${b.title} — ${b.role}.`
  ).join("\n");

  return {
    author,
    title:
      `Biblioteca exploratória — ${author}`,

    introduction:
      tidy(raw?.introduction, 1300) +
      "\n\nAs relações abaixo são hipóteses de leitura comparada; não foram comprovadas como preferências ou influências do escritor.",

    books,
    reading_path,
    sources,

    method_note:
      `Biblioteca exploratória produzida com auxílio de IA. Os livros exibidos tiveram sua identificação conferida em Open Library ou Google Books, mas as relações com ${author} não foram comprovadas em fontes primárias. Foram consultados serviços abertos para contexto; registros acadêmicos e catálogos não foram tratados como prova de influência. A lista e o percurso incluem somente os livros aprovados na conferência bibliográfica.`,

    context_sources: docs
      .filter(d =>
        d.kind === "contexto" ||
        d.kind === "metadado_academico"
      )
      .map(d => ({
        title: d.title,
        url: d.url,
        description:
          "Fonte de contexto, não evidência da relação com os livros sugeridos."
      }))
      .slice(0, 6)
  };
}

// FUNÇÃO PRINCIPAL

export default async function handler(req) {
  if (req.method !== "POST") {
    return json({
      error: "Use POST."
    }, 405);
  }

  let input;

  try {
    input = await req.json();
  } catch {
    return json({
      error: "Pedido inválido."
    }, 400);
  }

  const author = tidy(
    input?.author, 120
  );

  if (!author) {
    return json({
      error: "Informe o nome do escritor."
    }, 400);
  }

  if (giannetti(author)) {
    return json(giannettiLibrary());
  }

  try {
    const docs = await context(author);

    if (!docs.length) {
      return json({
        error:
          "Não foi possível identificar o escritor nas fontes abertas. A pesquisa foi interrompida para evitar uma biblioteca sem contexto."
      }, 422);
    }

    const raw = await generate(
      author, docs
    );

    const result = await curate(
      raw, author, docs
    );

    if (!result.books.length) {
      return json({
        error:
          "O Gemini respondeu, mas nenhum livro passou pela conferência bibliográfica. Não apresentaremos títulos incertos."
      }, 422);
    }

    return json(result);

  } catch (e) {
    console.error(
      "Literary Universe 2.3:",
      e.message
    );

    if (e.status === 429) {
      return json({
        error:
          "Limite de uso do Gemini atingido. Tente novamente mais tarde."
      }, 429);
    }

    if (
      e.status === 503 ||
      e.status === 502
    ) {
      return json({
        error:
          "O serviço Gemini está temporariamente indisponível. Consulte os logs da função library."
      }, 503);
    }

    if (
      e.status === 400 ||
      e.status === 404
    ) {
      return json({
        error:
          "Modelo Gemini não aceito pela API. Confira GEMINI_MODEL."
      }, 502);
    }

    if (
      e.status === 401 ||
      e.status === 403
    ) {
      return json({
        error:
          "O Gemini recusou a autenticação ou as permissões."
      }, 502);
    }

    return json({
      error:
        "Não foi possível concluir a pesquisa. Consulte os logs da função library na Netlify."
    }, 503);
  }
}
