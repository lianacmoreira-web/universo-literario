
  // Literary Universe — Reference Library 3.1
  // Netlify Function — Gemini + fontes bibliográficas gratuitas.
  // Retorna reference_books (documentados) e literary_connections (interpretativos).
  const NEXO = 'https://www.nexojornal.com.br/estante-favoritos/2016/08/13/os-5-livros-favoritos-do-economista-eduardo-giannetti';
  const clean = (v, n=2000) => String(v ?? '').trim().slice(0,n);
  const norm = v => clean(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const tokens = v => norm(v).split(' ').filter(x=>x.length>2);
  const reply = (v,status=200) => Response.json(v,{status,headers:{'Cache-Control':'no-store'}});
  const isGiannetti = s => /\bgiann?etti\b/.test(norm(s)) && (/eduardo/.test(norm(s)) || ['giannetti','gianetti'].includes(norm(s)));
  const seed = [
   ['Fiódor Dostoiévski','Os irmãos Karamázov','Autoengano','Liberdade, culpa e responsabilidade moral','Observe como os personagens justificam suas decisões.'],
   ['David Hume','Diálogos sobre a religião natural','A ilusão da alma','Ceticismo e limites da razão','Observe a forma dialogada e os limites dos argumentos.'],
   ['Friedrich Nietzsche','Aurora','Autoengano','Motivações ocultas e formação dos valores','Examine a diferença entre motivos declarados e ações.'],
   ['Machado de Assis','Dom Casmurro','Autoengano','Memória, narrativa e autojustificação','Observe as lacunas do narrador e sua persuasão.'],
   ['Thomas Nagel','The View from Nowhere','A ilusão da alma','Subjetividade e objetividade','Compare os pontos de vista subjetivo e objetivo.']
  ];
  function giannettiResult(){
   const reference_books=seed.map(([author,title])=>({author,title,relationship:'preferência declarada',evidence_type:'preferência declarada',evidence_scope:'título específico',evidence_note:'Título incluído em seleção atribuída ao economista no Nexo Jornal (2016). A página não foi revalidada nesta consulta.',evidence_source_url:NEXO,source_url:NEXO,cover_url:null,first_publication_year:null,publisher:null,edition:null,genre:null,synopsis:null,bibliographic_source_url:null}));
   const literary_connections=seed.map(([author,title,related_work,connection,reading_value])=>({author,title,related_work,connection:`${connection}. A aproximação com ${related_work} é uma proposta de leitura comparada, não uma influência causal demonstrada.`,reading_value,evidence_type:'afinidade interpretativa',evidence_note:'Conexão proposta pela curadoria; a seleção documentada do livro não prova influência sobre esta obra.',source_url:NEXO}));
   return assemble('Eduardo Giannetti',reference_books,literary_connections,[{title:'Seleção de cinco livros — Nexo Jornal (2016)',url:NEXO,description:'Fonte atribuída à seleção de livros; não prova conexões interpretativas.'}],'Dossiê preparado previamente; o conteúdo da fonte não foi reconsultado em tempo real.');
  }
  async function get(url,ms=5500){
   try {const r=await fetch(url,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(ms)});return r.ok?await r.json():null;}catch{return null;}
  }
  function abstractText(inv){
   if(!inv || typeof inv!=='object')return '';
   const p=[];for(const [w,idx] of Object.entries(inv))for(const i of idx||[])if(i<320)p[i]=w;
   return clean(p.map(x=>x||'').join(' ').replace(/\s+/g,' '),2200);
  }
  async function research(author){
   const q=encodeURIComponent(author);
   const [wiki,oa,ol]=await Promise.all([
    get(`https://pt.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${q}&gsrlimit=3&prop=extracts|info&exintro=1&explaintext=1&inprop=url&format=json`),
    get(`https://api.openalex.org/works?search=${q}&per-page=20&select=id,doi,title,publication_year,abstract_inverted_index`),
    get(`https://openlibrary.org/search/authors.json?q=${q}&limit=5`)
   ]);
   const docs=[];
   for(const p of Object.values(wiki?.query?.pages||{}))if(p.extract && norm(p.title).includes(tokens(author).at(-1)))docs.push({kind:'biografia',title:p.title,url:p.fullurl||`https://pt.wikipedia.org/wiki/${encodeURIComponent(p.title.replaceAll(' ','_'))}`,excerpt:clean(p.extract,1000)});
   for(const a of ol?.docs||[])if(norm(a.name)===norm(author))docs.push({kind:'identificacao',title:a.name,url:`https://openlibrary.org${a.key}`,excerpt:'Registro de identificação do escritor.'});
   for(const w of oa?.results||[]){const excerpt=abstractText(w.abstract_inverted_index);if(norm(w.title+' '+excerpt).includes(norm(author)))docs.push({kind:'estudo',title:w.title,url:w.doi||w.id,excerpt,year:w.publication_year});}
   return docs.filter(d=>d.url).slice(0,18);
  }
  const PROMPT=`Você é um pesquisador e curador literário. Responda SOMENTE um objeto JSON em português brasileiro.
  O escritor pesquisado deve ser relacionado a livros de OUTROS autores (jamais livros próprios ou coautorias).
  Crie DUAS seleções INDEPENDENTES:
  1. "documented": livros preferidos ou influências ESPECIFICAMENTE DOCUMENTADAS em entrevistas, depoimentos ou estudos que demonstrem uma relação. Se não houver prova suficiente, retorne []. Não invente links, citações ou declarações. Para cada item informe author, title, relationship ("preferência declarada" ou "influência documentada"), evidence_scope ("título específico" ou "autor apenas"), evidence_note e evidence_source_url. Se o documento mencionar apenas o autor e não o título, NÃO inclua o livro na lista documentada.
  2. "connections": entre 7 e 10 livros reais e relevantes, com autor, título, related_work (obra real do escritor pesquisado, se souber), connection (2 a 3 frases com relação literária ESPECÍFICA), reading_value (orientação de leitura), e evidence_type="afinidade interpretativa". Inclua relações literárias interessantes mesmo sem evidência de influência, mas nunca diga "claramente influenciado" sem fonte. Evite generalidades e repetições.
  Uma fonte bibliográfica prova a existência do livro, não a influência. Uma menção conjunta em artigo não comprova preferência. Os dados acadêmicos fornecidos são contexto, não provas automáticas.
  Formato: {"introduction":"","documented":[{"author":"","title":"","relationship":"","evidence_scope":"","evidence_note":"","evidence_source_url":""}],"connections":[{"author":"","title":"","related_work":"","connection":"","reading_value":"","evidence_type":"afinidade interpretativa"}]}.
  Não produza Markdown. Não crie URLs sem ter certeza. Não invente obras do pesquisado.`;
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  function overloaded(status, message='') {
   return [500,502,503,504,529].includes(status) || /high demand|overload|unavailable|resource exhausted|try again later|temporarily/i.test(message);
  }
  async function gemini(author,docs){
   const key=process.env.GEMINI_API_KEY,model=clean(process.env.GEMINI_MODEL,100);
   if(!key||!model)throw Object.assign(new Error('Configuração Gemini ausente.'),{status:503});
   const url=`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
   const body=JSON.stringify({systemInstruction:{parts:[{text:PROMPT}]},contents:[{role:'user',parts:[{text:`Escritor: ${author}\nContexto de fontes abertas (não comprova influências): ${JSON.stringify(docs).slice(0,12000)}\nProduza as duas listas separadas.`}]}],generationConfig:{responseMimeType:'application/json',temperature:0.35,maxOutputTokens:7500}});
   for(let attempt=1;attempt<=3;attempt++){
    try{
     const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body,signal:AbortSignal.timeout(18000)});
     const data=await r.json().catch(()=>null);
     if(!r.ok){
      const message=data?.error?.message||`Gemini HTTP ${r.status}`;
      const retryable=overloaded(r.status,message)||r.status===429;
      if(retryable&&attempt<3){console.warn(`Gemini indisponível: tentativa ${attempt}/3, HTTP ${r.status}`);await sleep(attempt===1?1200:2500);continue;}
      throw Object.assign(new Error(message),{status:r.status,overloaded:overloaded(r.status,message)});
     }
     const str=(data?.candidates?.[0]?.content?.parts||[]).map(p=>p.text||'').join('');
     if(!str)throw new Error('Resposta vazia do Gemini.');
     return JSON.parse(str);
    }catch(e){
     if((e.name==='TimeoutError'||e.name==='AbortError'||e instanceof TypeError)&&attempt<3){
      console.warn(`Gemini: falha transitória na tentativa ${attempt}/3: ${e.message}`);
      await sleep(attempt===1?1200:2500);continue;
     }
     if(e.name==='TimeoutError'||e.name==='AbortError')throw Object.assign(new Error('Tempo limite do Gemini excedido.'),{overloaded:true});
     throw e;
    }
   }
  }
  function authorIsSelf(other,researched){
   const a=tokens(researched),b=tokens(other);
   return a.length>1 && a.every(t=>b.includes(t));
  }
  function plausibleTitle(a,b){
   const x=norm(a),y=norm(b);if(!x||!y)return false;
   if(x===y)return true;
   const ax=tokens(a).filter(w=>!['the','and','dos','das','uma','para','with','sobre'].includes(w));
   const by=new Set(tokens(b));
   return ax.length>=2 && ax.filter(w=>by.has(w)).length/ax.length>=.8 && Math.abs(x.length-y.length)<30;
  }
  function plausibleAuthor(a,b){const x=tokens(a),y=new Set(tokens(b));return x.length>0 && y.has(x.at(-1)) && x.some(w=>y.has(w));}
  async function metadata(book){
   const q=new URLSearchParams({title:clean(book.title,150),author:clean(book.author,120),limit:'8'});
   const [ol,gb]=await Promise.all([
    get(`https://openlibrary.org/search.json?${q}`,4500),
    get(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent('intitle:'+book.title+' inauthor:'+book.author)}&maxResults=6`,4500)
   ]);
   for(const b of ol?.docs||[])if(plausibleTitle(book.title,b.title)&&(b.author_name||[]).some(x=>plausibleAuthor(book.author,x))){
    return {bibliographic_source_url:`https://openlibrary.org${b.key}`,cover_url:b.cover_i?`https://covers.openlibrary.org/b/id/${b.cover_i}-M.jpg`:null,first_publication_year:b.first_publish_year||null,publisher:b.publisher?.[0]||null,edition:null,genre:b.subject?.[0]||null};
   }
   for(const b of gb?.items||[]){const v=b.volumeInfo||{};if(plausibleTitle(book.title,v.title)&&(v.authors||[]).some(x=>plausibleAuthor(book.author,x))){
    return {bibliographic_source_url:v.infoLink||null,cover_url:v.imageLinks?.thumbnail?.replace(/^http:/,'https:')||null,first_publication_year:v.publishedDate?.slice(0,4)||null,publisher:v.publisher||null,edition:null,genre:v.categories?.[0]||null};
   }}
   return {bibliographic_source_url:null,cover_url:null,first_publication_year:null,publisher:null,edition:null,genre:null};
  }
  // A documented relation is accepted only if the source can be tied to the specific book.
  // Metadata and academic co-mentions do not qualify as documentary proof.
  function groundedDocument(item,docs){
   const url=clean(item.evidence_source_url,500);
   if(!/^https:\/\//i.test(url))return false;
   const matching=docs.find(d=>d.url===url);
   if(!matching)return false;
   const hay=norm(matching.title+' '+matching.excerpt);
   return hay.includes(norm(item.title)) && hay.includes(norm(item.author));
  }
  function assemble(author,reference_books,literary_connections,sources=[],methodExtra=''){
   const books=literary_connections.map(b=>({...b,role:b.evidence_type||'afinidade interpretativa',evidence_type:'afinidade interpretativa',author_evidence:'Não é uma preferência declarada.',book_evidence:'Leitura comparativa proposta pela curadoria.',evidence_note:'Afinidade interpretativa; não implica influência documentada.',source_url:b.bibliographic_source_url||null}));
   return {author,title:`Biblioteca de referência — ${author}`,introduction:'Duas listas complementares: livros com relação documentada e conexões literárias interpretativas.',reference_books,literary_connections,books,reading_path:literary_connections.map((b,i)=>`${i+1}. ${b.title} — ${b.author}.`).join('\n'),sources,method_note:`A primeira lista exige evidência documental específica. A segunda contém afinidades interpretativas e não afirma influências sem comprovação. Capas e metadados são obtidos de catálogos quando disponíveis; o ano e a editora podem corresponder a edições diferentes. ${methodExtra}`};
  }
  async function curate(author,raw,docs){
   const candidateConnections=(Array.isArray(raw.connections)?raw.connections:[]).filter(b=>b&&clean(b.author)&&clean(b.title)&&!authorIsSelf(b.author,author));
   const candidateDocumented=(Array.isArray(raw.documented)?raw.documented:[]).filter(b=>b&&clean(b.author)&&clean(b.title)&&!authorIsSelf(b.author,author));
   const all=[...candidateConnections.slice(0,12),...candidateDocumented.slice(0,10)];
   const metas=await Promise.all(all.map(metadata));
   const cache=new Map(all.map((b,i)=>[norm(b.author)+'|'+norm(b.title),metas[i]]));
   const literary_connections=[],reference_books=[],sources=[],seen=new Set();
   for(const b of candidateConnections){
    const id=norm(b.author)+'|'+norm(b.title);if(seen.has(id))continue;seen.add(id);
    const meta=cache.get(id)||{};
    const connection=clean(b.connection,1400),reading_value=clean(b.reading_value,650);
    if(connection.length<45)continue;
    literary_connections.push({author:clean(b.author,150),title:clean(b.title,200),related_work:clean(b.related_work,180),connection,reading_value,evidence_type:'afinidade interpretativa',...meta});
    if(meta.bibliographic_source_url)sources.push({title:`Registro bibliográfico — ${clean(b.title,160)}`,url:meta.bibliographic_source_url,description:'Dados do livro e eventual capa; não demonstra influência.'});
    if(literary_connections.length===10)break;
   }
   for(const b of candidateDocumented){
    if(!['preferência declarada','influência documentada'].includes(b.relationship))continue;
    if(b.evidence_scope!=='título específico')continue;
    if(!groundedDocument(b,docs))continue;
    const id=norm(b.author)+'|'+norm(b.title);
    const meta=cache.get(id)||{};
    reference_books.push({author:clean(b.author,150),title:clean(b.title,200),relationship:b.relationship,evidence_type:b.relationship,evidence_scope:'título específico',evidence_note:clean(b.evidence_note,900),evidence_source_url:b.evidence_source_url,source_url:b.evidence_source_url,cover_url:meta.cover_url||null,first_publication_year:meta.first_publication_year||null,publisher:meta.publisher||null,edition:meta.edition||null,genre:meta.genre||null,synopsis:null,bibliographic_source_url:meta.bibliographic_source_url||null});
    sources.push({title:`Evidência documental — ${clean(b.title,150)}`,url:b.evidence_source_url,description:'Fonte recuperada menciona o título e o autor; a natureza da relação deve ser conferida no documento.'});
    if(reference_books.length===10)break;
   }
   // Explicitly avoid presenting unverified claims as documented preferences.
   const uniqueSources=[...new Map(sources.filter(x=>x.url).map(s=>[s.url,s])).values()];
   const result=assemble(author,reference_books,literary_connections,uniqueSources,'A lista documental pode ficar vazia: nenhuma afirmação do modelo é aceita como prova sem correspondência textual nas fontes recuperadas.');
   result.introduction=clean(raw.introduction,1100)||result.introduction;
   return result;
  }
  export default async function handler(req){
   if(req.method!=='POST')return reply({error:'Use POST.'},405);
   let input;try{input=await req.json();}catch{return reply({error:'Pedido inválido.'},400);}
   const author=clean(input?.author,120);if(!author)return reply({error:'Informe o nome do escritor.'},400);
   if(isGiannetti(author))return reply(giannettiResult());
   try{
    const docs=await research(author);
    const raw=await gemini(author,docs);
    const result=await curate(author,raw,docs);
    if(!result.literary_connections.length&&!result.reference_books.length)return reply({error:'A pesquisa não produziu recomendações utilizáveis. Tente novamente.'},422);
    return reply(result);
   }catch(e){
    console.error('Literary Universe 3.1:',e.message);
    if(e.overloaded)return reply({error:'O Gemini está sobrecarregado no momento. Fizemos três tentativas automáticas. Aguarde alguns minutos e tente novamente.'},503);
    if(e.status===429)return reply({error:'Limite gratuito do Gemini atingido. Tente novamente mais tarde.'},429);
    if(e.status===400||e.status===404)return reply({error:'Confira a variável GEMINI_MODEL.'},502);
    if(e.status===401||e.status===403)return reply({error:'A API Gemini recusou a autenticação.'},502);
    return reply({error:'Falha na pesquisa. Consulte o log da função library na Netlify.'},503);
   }
  }
