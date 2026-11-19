
const form = document.querySelector("#search-form");
const authorInput = document.querySelector("#author");
const resultSection = document.querySelector("#result-section");
const loading = document.querySelector("#loading");
const errorBox = document.querySelector("#error");
const results = document.querySelector("#results");
const submitBtn = document.querySelector("#submit-btn");

const evidenceLabels = {
  "preferência declarada": "Preferência declarada",
  "influência documentada": "Influência documentada",
  "referência documentada": "Referência documentada",
  "afinidade interpretativa": "Afinidade interpretativa",
  "afinidade crítica": "Afinidade crítica",
  "contexto literário": "Contexto literário"
};

function esc(value = "") {
  return String(value).replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));
}

function validUrl(value) {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol)
      ? url.href
      : null;
  } catch {
    return null;
  }
}

function showError(message) {
  loading.classList.add("hidden");
  results.classList.add("hidden");
  errorBox.textContent = message;
  errorBox.classList.remove("hidden");
}

function displayValue(value) {
  return value === null ||
    value === undefined ||
    String(value).trim() === ""
      ? null
      : String(value).trim();
}

function renderCover(book) {
  const cover = validUrl(book.cover_url);

  if (!cover) {
    return `
      <div class="lu-cover-placeholder" aria-label="Capa não disponível">
        <span>LU</span>
        <small>CAPA NÃO DISPONÍVEL</small>
      </div>
    `;
  }

  return `
    <div class="lu-cover-frame">
      <img
        src="${esc(cover)}"
        alt="Capa catalogada de ${esc(book.title || "livro")}"
        loading="lazy"
        referrerpolicy="no-referrer"
        onerror="this.style.display='none';this.parentElement.classList.add('lu-cover-missing')"
      >
    </div>
  `;
}

function renderMetadata(book) {
  const items = [];

  if (displayValue(book.first_publication_year)) {
    items.push(
      `<span><strong>Primeira publicação:</strong> ${esc(book.first_publication_year)}</span>`
    );
  }

  if (displayValue(book.publisher)) {
    items.push(
      `<span><strong>Editora catalogada:</strong> ${esc(book.publisher)}</span>`
    );
  }

  if (displayValue(book.edition)) {
    items.push(
      `<span><strong>Edição:</strong> ${esc(book.edition)}</span>`
    );
  }

  if (displayValue(book.genre)) {
    items.push(
      `<span><strong>Gênero / assunto:</strong> ${esc(book.genre)}</span>`
    );
  }

  if (!items.length) return "";

  return `
    <div class="lu-book-metadata">
      ${items.join("")}
    </div>
  `;
}

function renderBibliographicLink(book) {
  const url = validUrl(book.bibliographic_source_url);

  if (!url) return "";

  return `
    <p class="lu-source-link">
      <a href="${esc(url)}" target="_blank" rel="noopener noreferrer">
        Consultar registro bibliográfico ↗
      </a>
    </p>
  `;
}

function renderDocumentedBook(book, index) {
  const relationship = String(
    book.relationship || book.evidence_type || ""
  ).toLowerCase();

  const label = evidenceLabels[relationship] ||
    "Relação documental";

  const evidenceUrl = validUrl(
    book.evidence_source_url || book.source_url
  );

  const synopsis = displayValue(book.synopsis);

  return `
    <article class="book-entry lu-book-entry">
      <span class="number">
        ${String(index + 1).padStart(2, "0")} /
        ${esc(label)}
      </span>

      <div class="lu-book-layout">
        ${renderCover(book)}

        <div class="lu-book-content">
          <h3>
            ${esc(book.author || "Autor não informado")}
            —
            <span>${esc(book.title || "Título não informado")}</span>
          </h3>

          <span class="evidence">${esc(label)}</span>

          ${renderMetadata(book)}

          ${synopsis ? `
            <p><strong>Sinopse:</strong> ${esc(synopsis)}</p>
          ` : ""}

          ${displayValue(book.evidence_note) ? `
            <p>
              <strong>Relação documentada:</strong>
              ${esc(book.evidence_note)}
            </p>
          ` : ""}

          ${evidenceUrl ? `
            <p class="lu-source-link">
              <a href="${esc(evidenceUrl)}"
                 target="_blank"
                 rel="noopener noreferrer">
                Consultar fonte documental ↗
              </a>
            </p>
          ` : ""}

          ${renderBibliographicLink(book)}
        </div>
      </div>
    </article>
  `;
}

function renderConnection(book, index) {
  const label = evidenceLabels[
    String(book.evidence_type || "").toLowerCase()
  ] || "Afinidade interpretativa";

  const relatedWork = displayValue(book.related_work);

  return `
    <article class="book-entry lu-book-entry">
      <span class="number">
        ${String(index + 1).padStart(2, "0")} /
        ${esc(label)}
      </span>

      <div class="lu-book-layout">
        ${renderCover(book)}

        <div class="lu-book-content">
          <h3>
            ${esc(book.author || "Autor não informado")}
            —
            <span>${esc(book.title || "Título não informado")}</span>
          </h3>

          <span class="evidence">${esc(label)}</span>

          ${renderMetadata(book)}

          ${relatedWork ? `
            <p>
              <strong>Obra em diálogo:</strong>
              ${esc(relatedWork)}
            </p>
          ` : ""}

          ${displayValue(book.connection) ? `
            <p>${esc(book.connection)}</p>
          ` : ""}

          ${displayValue(book.reading_value) ? `
            <p>
              <strong>O que observar:</strong>
              ${esc(book.reading_value)}
            </p>
          ` : ""}

          ${renderBibliographicLink(book)}
        </div>
      </div>
    </article>
  `;
}

function renderReadingPath(connections) {
  if (!connections.length) return "";

  return `
    <section class="reading-path">
      <p class="eyebrow">PERCURSO SUGERIDO</p>
      <h3>Como percorrer estas leituras</h3>

      <ol class="lu-reading-list">
        ${connections.map(book => `
          <li>
            <strong>${esc(book.title || "")}</strong>
            <span> — ${esc(book.author || "")}</span>
          </li>
        `).join("")}
      </ol>
    </section>
  `;
}

function renderSources(sources) {
  const unique = new Map();

  for (const source of sources) {
    const url = validUrl(source.url);

    if (!url || unique.has(url)) continue;

    unique.set(url, {
      title: source.title || "Fonte",
      description: source.description || "",
      url
    });
  }

  const items = [...unique.values()];

  if (!items.length) return "";

  return `
    <section class="sources">
      <p class="eyebrow">RASTREABILIDADE</p>
      <h3>Fontes e registros consultados</h3>

      <ol class="source-list">
        ${items.map(source => `
          <li>
            <strong>${esc(source.title)}</strong>

            ${source.description ? `
              — ${esc(source.description)}
            ` : ""}

            · <a href="${esc(source.url)}"
                 target="_blank"
                 rel="noopener noreferrer">
                Acessar registro ↗
              </a>
          </li>
        `).join("")}
      </ol>
    </section>
  `;
}

function render(data) {
  const documented = Array.isArray(data.reference_books)
    ? data.reference_books.slice(0, 10)
    : [];

  const connections = Array.isArray(data.literary_connections)
    ? data.literary_connections.slice(0, 10)
    : [];

  const sources = Array.isArray(data.sources)
    ? data.sources
    : [];

  if (!documented.length && !connections.length) {
    throw new Error(
      "A pesquisa não retornou livros. Tente novamente com o nome completo do escritor."
    );
  }

  const author = data.author || "Escritor pesquisado";

  results.innerHTML = `
    <div class="result-head">
      <div>
        <p class="eyebrow">LITERARY UNIVERSE / RESULTADOS</p>

        <h2>${esc(author)}</h2>

        <p>${esc(data.introduction || "")}</p>
      </div>

      <button class="print-btn" id="print-btn">
        ↓ SALVAR / IMPRIMIR PDF
      </button>
    </div>

    <section class="lu-library-section"
             aria-labelledby="lu-documented-heading">

      <div class="lu-section-heading">
        <p class="eyebrow">01 / BIBLIOTECA DE REFERÊNCIA</p>

        <h2 id="lu-documented-heading">
          Livros preferidos e influências documentadas
        </h2>

        <p>
          Livros associados ao escritor por declarações
          ou evidências documentais específicas.
        </p>
      </div>

      ${documented.length ? `
        <div class="book-list">
          ${documented.map(renderDocumentedBook).join("")}
        </div>
      ` : `
        <div class="lu-empty-state">
          <h3>Nenhuma relação documental confirmada nesta pesquisa</h3>

          <p>
            Não foram encontradas evidências suficientes
            para apresentar livros como preferências declaradas
            ou influências documentadas deste escritor.
            Isso não significa que tais relações não existam.
          </p>

          <p>
            Explore abaixo as conexões literárias propostas
            pela curadoria.
          </p>
        </div>
      `}
    </section>

    <section class="lu-library-section"
             aria-labelledby="lu-connections-heading">

      <div class="lu-section-heading">
        <p class="eyebrow">02 / CONEXÕES LITERÁRIAS</p>

        <h2 id="lu-connections-heading">
          Livros em diálogo com a obra
        </h2>

        <p>
          Aproximações entre temas, imagens, estilos,
          procedimentos de escrita e tradições literárias.
          Essas relações não devem ser interpretadas
          automaticamente como influências comprovadas.
        </p>
      </div>

      ${connections.length ? `
        <div class="book-list">
          ${connections.map(renderConnection).join("")}
        </div>
      ` : `
        <div class="lu-empty-state">
          <p>
            Não foram produzidas conexões literárias
            nesta pesquisa.
          </p>
        </div>
      `}
    </section>

    ${renderReadingPath(connections)}

    ${renderSources(sources)}

    <p class="disclaimer">
      ${esc(
        data.method_note ||
        "As preferências documentadas e as conexões interpretativas são categorias distintas. Um registro bibliográfico comprova dados sobre um livro, não a existência de uma influência."
      )}
    </p>
  `;

  results.classList.remove("hidden");

  const printBtn = document.querySelector("#print-btn");

  if (printBtn) {
    printBtn.addEventListener("click", () => window.print());
  }
}

form.addEventListener("submit", async event => {
  event.preventDefault();

  const author = authorInput.value.trim();

  if (!author) return;

  resultSection.classList.remove("hidden");
  loading.classList.remove("hidden");
  errorBox.classList.add("hidden");
  results.classList.add("hidden");

  submitBtn.disabled = true;
  submitBtn.textContent = "Pesquisando…";

  resultSection.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });

  try {
    const response = await fetch("/.netlify/functions/library", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ author })
    });

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(
        payload.error || "Não foi possível concluir a pesquisa."
      );
    }

    render(payload);

  } catch (err) {
    showError(
      err.message ||
      "Ocorreu um erro inesperado. Tente novamente."
    );

  } finally {
    loading.classList.add("hidden");
    submitBtn.disabled = false;
    submitBtn.innerHTML = 'Construir biblioteca <span>→</span>';
  }
});
