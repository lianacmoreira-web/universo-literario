
const NEXO = 'https://www.nexojornal.com.br/estante-favoritos/2016/08/13/os-5-livros-favoritos-do-economista-eduardo-giannetti';

const SOURCE = {
  title: 'Os 5 livros favoritos do economista Eduardo Giannetti — Nexo Jornal (13/08/2016)',
  url: NEXO,
  description: 'Seleção de cinco títulos comentados pelo próprio Eduardo Giannetti; documenta preferência pelos livros específicos.'
};

const G = [
  [
    'Fiódor Dostoiévski',
    'Os irmãos Karamázov',
    'Formação intelectual e problema moral',
    'Giannetti identifica este romance como experiência decisiva de sua adolescência. A leitura aproxima a investigação filosófica dos conflitos vividos: fé, responsabilidade, liberdade e culpa não aparecem como conceitos abstratos, mas como dilemas entre pessoas. Uma aproximação possível com Autoengano está na tensão entre aquilo que os personagens afirmam saber sobre si e as motivações que seus atos revelam. Essa aproximação é interpretativa; a preferência pelo romance, ao contrário, está explicitamente documentada.',
    'Observe como os personagens justificam as próprias escolhas, como a responsabilidade moral é disputada e como argumentos racionais convivem com impulsos contraditórios.',
    'Autoengano'
  ],
  [
    'David Hume',
    'Diálogos sobre a religião natural',
    'Ceticismo e limites da razão',
    'Giannetti escolhe explicitamente os Diálogos e destaca sua força filosófica e literária. O debate entre interlocutores sobre a possibilidade de conhecer a ordem do mundo oferece uma entrada para o problema dos limites do conhecimento humano. Em A ilusão da alma, Giannetti examina questões sobre identidade, consciência e o que podemos afirmar acerca de nós mesmos. A relação entre as obras é uma proposta de leitura comparada, não uma alegação de que Hume tenha determinado a tese do ensaio.',
    'Acompanhe a diferença entre crença, argumento e prova; perceba como a forma dialogada impede respostas simples e testa a segurança das convicções.',
    'A ilusão da alma'
  ],
  [
    'Friedrich Nietzsche',
    'Aurora',
    'Psicologia moral e origem dos valores',
    'Ao recomendar Aurora, Giannetti declara voltar a esse livro e valoriza especialmente a psicologia moral de Nietzsche. A investigação nietzschiana dos hábitos, juízos e motivações permite ler criticamente as explicações que damos para nossa conduta. Em Autoengano, Giannetti também interroga a distância entre a imagem que fazemos de nós e as forças que nos movem. A afinidade temática é sólida como interpretação; a fonte comprova a preferência pelo título, mas não uma dependência intelectual entre os dois livros.',
    'Preste atenção à suspeita dirigida aos motivos declarados, à formação histórica dos valores e à diferença entre uma explicação moral e uma explicação psicológica.',
    'Autoengano'
  ],
  [
    'Machado de Assis',
    'Dom Casmurro',
    'Narrativa, memória e autointerpretação',
    'Giannetti apresenta Dom Casmurro como uma obra de especial importância para sua relação com a língua portuguesa. O romance também fornece um laboratório para examinar o narrador que organiza a própria memória e procura persuadir o leitor de sua versão dos acontecimentos. Por isso, é uma leitura fecunda ao lado de Autoengano: ambos permitem perguntar como a narrativa pessoal pode ocultar dúvidas, desejos e contradições. Essa ponte analítica é proposta pela curadoria; a admiração de Giannetti pelo romance é diretamente documentada.',
    'Investigue as lacunas do relato de Bentinho, os recursos de persuasão do narrador e o que permanece impossível de comprovar sobre suas lembranças.',
    'Autoengano'
  ],
  [
    'Thomas Nagel',
    'The View from Nowhere',
    'Perspectiva subjetiva e objetividade',
    'Giannetti inclui The View from Nowhere entre seus favoritos e manifesta admiração pelo rigor de Thomas Nagel. O livro examina a tensão entre a perspectiva situada de cada sujeito e a ambição de alcançar um ponto de vista objetivo. Essa questão ajuda a ler A ilusão da alma, em que a identidade pessoal e a experiência consciente se tornam objetos de reflexão. A recomendação é comprovada no nível do título; a relação específica com o ensaio de Giannetti é uma interpretação curatorial, e não uma influência demonstrada pela fonte.',
    'Compare os limites da perspectiva em primeira pessoa com a pretensão de objetividade; observe o que se perde e o que se ganha ao mudar de ponto de vista.',
    'A ilusão da alma'
  ]
];

function answer(data, status = 200) {
  return Response.json(data, {
    status,
    headers: { 'Cache-Control': 'no-store' }
  });
}

function clean(value, max = 1500) {
  return String(value ?? '').trim().slice(0, max);
}

function norm(value) {
  return clean(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function isGiannetti(value) {
  const name = norm(value);

  return (
    /\bgiann?etti\b/.test(name) &&
    (
      /eduardo/.test(name) ||
      name === 'giannetti' ||
      name === 'gianetti'
    )
  );
}

function giannettiLibrary() {
  return {
    author: 'Eduardo Giannetti',
    title: 'Biblioteca de referência — Eduardo Giannetti',

    introduction:
      'Esta biblioteca parte de uma fonte primária identificável: em 2016, Eduardo Giannetti selecionou e comentou cinco livros de outros autores para o Nexo Jornal. Em vez de completar artificialmente uma lista de dez, apresentamos os cinco títulos documentados e propomos conexões críticas com questões de sua obra ensaística. A preferência por cada livro é um dado sustentado pela publicação; as aproximações com Autoengano e A ilusão da alma são interpretações curatoriais, não provas de influência direta. O objetivo é oferecer uma trilha de leitura verificável, capaz de distinguir testemunho, descrição bibliográfica e análise.',

    books: G.map(([
      author,
      title,
      role,
      connection,
      reading_value,
      related_work
    ]) => ({
      author,
      title,
      role,
      connection,
      reading_value,
      related_work,
      evidence_type: 'preferência declarada',

      author_evidence:
        'Eduardo Giannetti escolheu e comentou uma obra deste autor na seção Favoritos do Nexo Jornal (2016).',

      book_evidence:
        `O título ${title} consta expressamente entre os cinco livros selecionados e comentados por Giannetti na fonte indicada.`,

      evidence_note:
        'A escolha do livro é documentada; a conexão proposta com a obra de Giannetti é interpretação crítica, não comprovação de influência causal.',

      source_url: NEXO
    })),

    reading_path:
      '1. Os irmãos Karamázov: formação e conflitos morais. ' +
      '2. Aurora: suspeita sobre os motivos da ação. ' +
      '3. Dom Casmurro: memória, narrativa e autoengano. ' +
      '4. Diálogos sobre a religião natural: limites do conhecimento. ' +
      '5. The View from Nowhere: subjetividade e objetividade.',

    sources: [SOURCE],

    method_note:
      'Curadoria documental baseada em seleção explícita do próprio escritor publicada pelo Nexo Jornal em 13/08/2016. São cinco preferências atestadas, não dez sugestões inferidas. As relações com obras de Giannetti são leituras interpretativas e devem ser avaliadas criticamente. Não houve consulta em tempo real à página durante cada solicitação.'
  };
}

async function safeJson(url) {
  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(4000)
    });

    if (!response.ok) return null;

    return await response.json();
  } catch {
    return null;
  }
}

async function dossier(author) {
  const query = encodeURIComponent(author);

  const [wiki, books] = await Promise.all([
    safeJson(
      `https://pt.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${query}&gsrlimit=3&prop=extracts|info&exintro=1&explaintext=1&inprop=url&format=json`
    ),

    safeJson(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent('inauthor:' + author)}&maxResults=5`
    )
  ]);

  const result = [];

  for (const page of Object.values(wiki?.query?.pages || {})) {
    if (page.extract) {
      result.push({
        type: 'contexto_enciclopedico',
        title: page.title,
        url: page.fullurl ||
          'https://pt.wikipedia.org/wiki/' +
          encodeURIComponent(page.title.replaceAll(' ', '_')),
        excerpt: clean(page.extract, 1300)
      });
    }
  }

  for (const book of books?.items || []) {
    const info = book.volumeInfo || {};

    if (info.title) {
      result.push({
        type: 'catalogo_obras_do_pesquisado',
        title: info.title,
        authors: info.authors || [],
        url: info.infoLink || '',
        description: clean(info.description, 350)
      });
    }
  }

  return result;
}

const PROMPT = `
Você é curador acadêmico.

Retorne apenas JSON válido.

Não invente títulos, fontes ou evidências.

Recomende somente livros de OUTROS autores, jamais
do escritor pesquisado nem coautorias.

O catálogo de livros do escritor pesquisado é apenas
contexto, não prova de influência.

Se não houver evidência explícita sobre uma preferência,
use "afinidade crítica" ou "contexto literário".

Não alegue preferência documentada sem fonte primária
sobre o título específico.

Não invente URLs.

Prefira zero a cinco títulos seguros a dez títulos duvidosos.

Cada conexão deve ser específica, longa e indicar a obra
do escritor pesquisado usada como ponto de comparação.

Responda no esquema:
{
  "author": "",
  "title": "",
  "introduction": "",
  "books": [
    {
      "author": "",
      "title": "",
      "role": "",
      "evidence_type": "afinidade crítica",
      "connection": "",
      "reading_value": "",
      "related_work": "",
      "author_evidence": "",
      "book_evidence": "",
      "evidence_note": "",
      "source_url": ""
    }
  ],
  "reading_path": "",
  "sources": [],
  "method_note": ""
}
`;

async function gemini(author, docs, key, model) {
  const url =
    'https://generativelanguage.googleapis.com/v1beta/models/' +
    encodeURIComponent(model) +
    ':generateContent';

  const body = {
    systemInstruction: {
      parts: [{ text: PROMPT }]
    },

    contents: [{
      role: 'user',
      parts: [{
        text:
          `Autor solicitado: ${author}\n` +
          `Dossiê de contexto (NÃO prova influência): ${JSON.stringify(docs)}\n` +
          'Produza uma biblioteca exploratória. Se não puder confirmar um livro real e uma conexão específica, não o inclua.'
      }]
    }],

    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.1,
      maxOutputTokens: 4500
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': key
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(17000)
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(
      payload?.error?.message || 'Falha no Gemini'
    );

    error.status = response.status;
    throw error;
  }

  const output = payload?.candidates?.[0]?.content?.parts
    ?.map(part => part.text || '')
    .join('');

  if (!output) {
    throw new Error('Resposta vazia do Gemini');
  }

  return JSON.parse(output);
}

function filterExploratory(result, author) {
  const seen = new Set();
  const books = [];

  for (const book of Array.isArray(result?.books) ? result.books : []) {
    const writer = clean(book?.author, 150);
    const title = clean(book?.title, 180);
    const connection = clean(book?.connection, 1800);
    const reading = clean(book?.reading_value, 700);

    if (
      !writer ||
      !title ||
      connection.length < 220 ||
      reading.length < 50
    ) {
      continue;
    }

    const names = norm(writer);
    const target = norm(author);

    if (
      names === target ||
      names.includes(target) ||
      (target.includes(names) && names.length > 5)
    ) {
      continue;
    }

    const key = norm(writer) + '|' + norm(title);

    if (seen.has(key)) continue;

    seen.add(key);

    books.push({
      author: writer,
      title,
      role: clean(book.role, 200),
      connection,
      reading_value: reading,
      related_work: clean(book.related_work, 180),
      evidence_type: 'afinidade crítica',

      author_evidence:
        'Relação pessoal com o escritor pesquisado não documentada nas fontes disponíveis.',

      book_evidence:
        'Título sugerido exploratoriamente; requer confirmação bibliográfica independente.',

      evidence_note:
        'Hipótese curatorial, não evidência de leitura, preferência ou influência.',

      source_url: ''
    });

    if (books.length === 5) break;
  }

  return {
    author,
    title: 'Biblioteca exploratória — ' + author,
    introduction: clean(result?.introduction, 1300),
    books,
    reading_path: clean(result?.reading_path, 1300),
    sources: [],

    method_note:
      'Resultado exploratório gerado com IA a partir de fontes gerais. Não há comprovação independente de cada título ou relação. Não utilizar como bibliografia acadêmica sem revisão.'
  };
}

export default async function handler(req) {
  if (req.method !== 'POST') {
    return answer({ error: 'Use POST.' }, 405);
  }

  let body;

  try {
    body = await req.json();
  } catch {
    return answer({ error: 'Pedido inválido.' }, 400);
  }

  const author = clean(body?.author, 120);

  if (!author) {
    return answer({
      error: 'Informe o nome do escritor.'
    }, 400);
  }

  if (isGiannetti(author)) {
    return answer(giannettiLibrary());
  }

  const key = process.env.GEMINI_API_KEY;
  const model = clean(process.env.GEMINI_MODEL, 100);

  if (!key || !model) {
    return answer({
      error:
        'Configure GEMINI_API_KEY e GEMINI_MODEL na Netlify.'
    }, 503);
  }

  try {
    const docs = await dossier(author);

    if (!docs.length) {
      return answer({
        error:
          'Não foram encontradas fontes de contexto suficientes. Não apresentaremos uma lista inventada.'
      }, 422);
    }

    const raw = await gemini(author, docs, key, model);
    const library = filterExploratory(raw, author);

    if (!library.books.length) {
      return answer({
        error:
          'Não foi possível produzir recomendações com qualidade mínima. A pesquisa precisa de fontes adicionais.'
      }, 422);
    }

    return answer(library);

  } catch (error) {
    console.error(
      'Literary Universe 2.2:',
      error.message
    );

    if (error.status === 429) {
      return answer({
        error:
          'Limite gratuito do Gemini atingido. Tente mais tarde.'
      }, 429);
    }

    return answer({
      error:
        'Não foi possível concluir a pesquisa. Verifique a disponibilidade do Gemini e tente novamente.'
    }, 503);
  }
}
