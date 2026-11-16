const form = document.querySelector("#search-form");
const authorInput = document.querySelector("#author");
const resultSection = document.querySelector("#result-section");
const loading = document.querySelector("#loading");
const errorBox = document.querySelector("#error");
const results = document.querySelector("#results");
const submitBtn = document.querySelector("#submit-btn");

const evidenceLabels = {
  "preferência declarada": "Preferência declarada",
  "referência documentada": "Referência documentada",
  "afinidade crítica": "Afinidade crítica",
  "contexto literário": "Contexto literário"
};

function esc(value="") {
  return String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function validUrl(value) {
  try { const u = new URL(value); return ["https:","http:"].includes(u.protocol) ? u.href : null; }
  catch { return null; }
}
function showError(message) {
  loading.classList.add("hidden");
  results.classList.add("hidden");
  errorBox.textContent = message;
  errorBox.classList.remove("hidden");
}
function render(data) {
  const books = Array.isArray(data.books) ? data.books.slice(0,10) : [];
  if (!books.length) throw new Error("A pesquisa não retornou livros suficientes. Tente novamente com o nome completo do autor.");
  const sources = Array.isArray(data.sources) ? data.sources : [];
  results.innerHTML = `
    <div class="result-head">
      <div><p class="eyebrow">BIBLIOTECA DE REFERÊNCIA</p><h2>${esc(data.title || data.author || "Universo literário")}</h2>
      <p>${esc(data.introduction || "")}</p></div>
      <button class="print-btn" id="print-btn">↓ SALVAR / IMPRIMIR PDF</button>
    </div>
    <div class="book-list">${books.map((b,i)=>{
      const label = evidenceLabels[String(b.evidence_type||"").toLowerCase()] || "Relação a verificar";
      const url = validUrl(b.source_url);
      return `<article class="book-entry">
        <span class="number">${String(i+1).padStart(2,"0")} / ${esc(b.role || "LEITURA")}</span>
        <h3>${esc(b.author)} — <span>${esc(b.title)}</span></h3>
        <span class="evidence">${esc(label)}</span>
        <p>${esc(b.connection || "")}</p>
        <p><strong>O que observar:</strong> ${esc(b.reading_value || "")}</p>
        ${url ? `<p><a href="${esc(url)}" target="_blank" rel="noopener noreferrer">Ver fonte desta relação ↗</a></p>` : ""}
      </article>`;
    }).join("")}</div>
    <section class="reading-path"><p class="eyebrow">PERCURSO SUGERIDO</p><h3>Como ler esta biblioteca</h3><p>${esc(data.reading_path || "")}</p></section>
    <section class="sources"><p class="eyebrow">RASTREABILIDADE</p><h3>Fontes consultadas</h3>
      <ol class="source-list">${sources.map(s=>{const u=validUrl(s.url);return `<li><strong>${esc(s.title||"Fonte")}</strong>${s.description?` — ${esc(s.description)}`:""}${u?` · <a href="${esc(u)}" target="_blank" rel="noopener noreferrer">Acessar fonte ↗</a>`:""}</li>`}).join("")}</ol>
    </section>
    <p class="disclaimer">${esc(data.method_note || "As categorias distinguem declarações do autor, referências documentadas e interpretações críticas. Uma relação não deve ser entendida automaticamente como influência.")}</p>`;
  results.classList.remove("hidden");
  document.querySelector("#print-btn").addEventListener("click",()=>window.print());
}
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const author = authorInput.value.trim();
  if (!author) return;
  resultSection.classList.remove("hidden");
  loading.classList.remove("hidden");
  errorBox.classList.add("hidden");
  results.classList.add("hidden");
  submitBtn.disabled = true;
  submitBtn.innerHTML = "Pesquisando…";
  resultSection.scrollIntoView({behavior:"smooth",block:"start"});
  try {
    const response = await fetch("/.netlify/functions/library", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({author})
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Não foi possível concluir a pesquisa.");
    render(payload);
  } catch (err) {
    showError(err.message || "Ocorreu um erro inesperado. Tente novamente.");
  } finally {
    loading.classList.add("hidden");
    submitBtn.disabled = false;
    submitBtn.innerHTML = 'Construir biblioteca <span>→</span>';
  }
});
