import { renderLayout } from "./layout.js";
import { apiGet, apiPost } from "./api.js";
import { requireAuth } from "./guard.js";

requireAuth();
renderLayout("anuncios");

const page = document.getElementById("pageContent");

/* =========================
   TEMPLATE BASE
========================= */
page.innerHTML = `
<section class="pagebar anuncios-pagebar-final">
  <div class="anuncios-top-row">
    <h1 class="pagebar-title">Anúncios</h1>

    <input
      id="buscaAnuncio"
      class="search-input anuncios-search"
      placeholder="Buscar por qualquer informação..."
    />

    <div class="pagebar-last-sync">
      Última atualização:
      <strong id="lastSyncLabel">—</strong>
    </div>
  </div>

  <div class="anuncios-bottom-row">
    <label class="stock-filter">
      <input type="checkbox" id="filterStockPositive">
      Estoque positivo
    </label>

    <div class="filter-buttons" id="statusButtons">
      <button data-status="todos" class="active">Todos</button>
      <button data-status="ativo">Ativos</button>
      <button data-status="pausado">Pausados</button>
      <button data-status="vinculados">Vinculados</button>
      <button data-status="sem_vinculo">Sem vínculo</button>
    </div>

    <button id="btnSync" class="btn btn-primary">
      Atualizar anúncios
    </button>

    <div class="count-card">
      <span>Total</span>
      <strong id="countValue">0</strong>
    </div>
  </div>
</section>

<section id="bulkBar" class="anuncios-bulk hidden">
  <strong><span id="bulkCount">0</span> selecionados</strong>

  <div class="bulk-actions">
    <select id="bulkSkuSelect">
      <option value="">Selecione o SKU</option>
    </select>

    <button id="bulkVincular" class="btn btn-primary">Vincular</button>
    <button id="bulkDesvincular" class="btn btn-muted">Desvincular</button>
    <button id="bulkCancelar" class="btn btn-muted">Cancelar</button>
  </div>
</section>

<div class="table-wrap anuncios-table-wrap">
  <table id="tabelaAnuncios">
    <thead>
      <tr>
        <th><input type="checkbox" id="checkAll"></th>
        <th>Código ML</th>
        <th>Anúncio</th>
        <th>Status</th>
        <th>Estoque ML</th>
        <th>SKU vinculado</th>
        <th>Ação</th>
      </tr>
    </thead>
    <tbody id="tabelaBody"></tbody>
  </table>
</div>
`;

/* =========================
   TOAST
========================= */
function showToast(arg1, arg2, arg3) {
  let title = "";
  let message = "";
  let type = "info";

  if (typeof arg1 === "object" && arg1 !== null) {
    title = arg1.title || "";
    message = arg1.message || "";
    type = arg1.type || "info";
  } else {
    title = arg1 || "";
    message = arg2 || "";
    type = arg3 || "info";
  }

  const overlay = document.getElementById("toastOverlay");
  const titleEl = document.getElementById("toastTitle");
  const msgEl = document.getElementById("toastMessage");
  const okBtn = document.getElementById("toastOk");

  titleEl.textContent = title;
  msgEl.textContent = message;
  okBtn.textContent = "OK";
  overlay.classList.remove("hidden");

  okBtn.onclick = () => overlay.classList.add("hidden");
  if (type === "loading") return;

  setTimeout(() => overlay.classList.add("hidden"), 1800);
}

/* =========================
   ESTADO
========================= */
const tbody = document.getElementById("tabelaBody");
const busca = document.getElementById("buscaAnuncio");
const filterStockPositive = document.getElementById("filterStockPositive");
const statusButtons = document.getElementById("statusButtons");
const countValue = document.getElementById("countValue");
const checkAll = document.getElementById("checkAll");
const btnSync = document.getElementById("btnSync");
const lastSyncLabel = document.getElementById("lastSyncLabel");

let anuncios = [];
let skus = [];
let statusAtual = "todos";
let selecionados = new Set();

/* =========================
   DATA HELPERS
========================= */
function formatDate(dt) {
  return dt.toLocaleString("pt-BR");
}

function setLastSyncNow() {
  const now = new Date();
  localStorage.setItem("ml_last_sync", now.toISOString());
  lastSyncLabel.textContent = formatDate(now);
}

function loadLastSync() {
  const v = localStorage.getItem("ml_last_sync");
  if (v) lastSyncLabel.textContent = formatDate(new Date(v));
}

/* =========================
   API LOADERS
========================= */
async function carregarSkus() {
  skus = await apiGet("/sku");
}

async function carregarAnuncios() {
  anuncios = await apiGet("/ml/anuncios");
}

/* =========================
   AUTO-VÍNCULO INTELIGENTE
========================= */
async function tentarAutoVinculo(anuncio) {
  if (anuncio.sku) return;
  if (!anuncio.seller_sku) return;

  const skuMatch = skus.find(
    (s) => String(s.codigo).trim() === String(anuncio.seller_sku).trim()
  );

  if (!skuMatch) return;

  try {
    await apiPost(`/sku/${skuMatch.id}/vincular`, {
      ml_item_id: anuncio.ml_item_id
    });
  } catch {
    // silencioso por design
  }
}

/* =========================
   SYNC
========================= */
btnSync.onclick = async () => {
  try {
    showToast("Atualizando", "Atualizando anúncios do Mercado Livre…", "loading");
    btnSync.disabled = true;

    await apiPost("/ml/anuncios/sync");
    setLastSyncNow();

    await boot();
    showToast("Concluído", "Anúncios atualizados com sucesso.");
  } catch {
    showToast("Erro", "Falha ao atualizar anúncios.");
  } finally {
    btnSync.disabled = false;
  }
};

/* =========================
   FILTROS
========================= */
statusButtons.querySelectorAll("button").forEach((btn) => {
  btn.onclick = () => {
    statusButtons.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    statusAtual = btn.dataset.status;
    aplicarTudo();
  };
});

busca.oninput = aplicarTudo;
filterStockPositive.onchange = aplicarTudo;

function getListaVisivel() {
  let lista = [...anuncios];

  if (statusAtual === "vinculados") lista = lista.filter((a) => a.sku);
  if (statusAtual === "sem_vinculo") lista = lista.filter((a) => !a.sku);
  if (["ativo", "pausado"].includes(statusAtual))
    lista = lista.filter((a) => a.status === statusAtual);

  if (filterStockPositive.checked)
    lista = lista.filter((a) => Number(a.estoque_ml) > 0);

  const termo = busca.value.toLowerCase().trim();
  return lista.filter((a) =>
    `${a.ml_item_id} ${a.titulo} ${a?.sku?.sku_codigo || ""}`.toLowerCase().includes(termo)
  );
}

/* =========================
   RENDER
========================= */
function render(lista) {
  tbody.innerHTML = "";

  if (!lista.length) {
    tbody.innerHTML = `<tr><td colspan="7">Nenhum anúncio encontrado</td></tr>`;
    countValue.textContent = "0";
    return;
  }

  lista.forEach((a) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td></td>
      <td>${a.ml_item_id}</td>
      <td>${a.titulo}</td>
      <td>${a.status}</td>
      <td>${a.estoque_ml}</td>
      <td>${a?.sku?.sku_codigo ?? "—"}</td>
      <td></td>
    `;
    tbody.appendChild(tr);
  });

  countValue.textContent = String(lista.length);
}

/* =========================
   PIPELINE
========================= */
function aplicarTudo() {
  render(getListaVisivel());
}

async function boot() {
  showToast("Carregando", "Carregando anúncios do Mercado Livre…", "loading");
  loadLastSync();

  await carregarSkus();
  await carregarAnuncios();

  // 🔥 AUTO-VÍNCULO
  for (const a of anuncios) {
    await tentarAutoVinculo(a);
  }

  await carregarAnuncios();
  aplicarTudo();

  document.getElementById("toastOverlay").classList.add("hidden");
}

await boot();
