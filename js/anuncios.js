import { renderLayout } from "./layout.js";
import { apiGet, apiPost } from "./api.js";
import { requireAuth } from "./guard.js";

requireAuth();
renderLayout("anuncios");

const page = document.getElementById("pageContent");

/* ================= TEMPLATE ================= */
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
      <button data-filter="todos" class="active">Todos</button>
      <button data-filter="ativo">Ativos</button>
      <button data-filter="pausado">Pausados</button>
      <button data-filter="vinculados">Vinculados</button>
      <button data-filter="sem_vinculo">Sem vínculo</button>
      <button data-filter="full">FULL</button>
      <button data-filter="me">Mercado Envios</button>
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

<div class="table-wrap anuncios-table-wrap">
  <table>
    <thead>
      <tr>
        <th>Código ML</th>
        <th>Anúncio</th>
        <th>Tipo</th>
        <th>Logística</th>
        <th>Status</th>
        <th>Estoque</th>
        <th>SKU</th>
        <th>Ação</th>
      </tr>
    </thead>
    <tbody id="tabelaBody"></tbody>
  </table>
</div>

<div id="toast" class="toast hidden"></div>
`;

/* ================= STATE ================= */
let anuncios = [];
let statusFilter = "todos";
let vinculoFilter = "todos";
let logisticaFilter = "todos";

/* ================= ELEMENTOS ================= */
const tbody = document.getElementById("tabelaBody");
const busca = document.getElementById("buscaAnuncio");
const countValue = document.getElementById("countValue");
const lastSyncLabel = document.getElementById("lastSyncLabel");
const filterStockPositive = document.getElementById("filterStockPositive");
const btnSync = document.getElementById("btnSync");
const toast = document.getElementById("toast");

/* ================= TOAST ================= */
function showToast(msg, type = "success") {
  toast.textContent = msg;
  toast.className = `toast ${type}`;
  toast.classList.remove("hidden");
  setTimeout(() => toast.classList.add("hidden"), 3000);
}

/* ================= HELPERS ================= */
function calcLastSync() {
  const datas = anuncios
    .map(a => a.atualizado_em)
    .filter(Boolean)
    .map(d => new Date(d).getTime());

  if (!datas.length) return "—";
  return new Date(Math.max(...datas)).toLocaleString("pt-BR");
}

/* ================= FILTROS ================= */
document.querySelectorAll("#statusButtons button").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll("#statusButtons button")
      .forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    const f = btn.dataset.filter;
    statusFilter = vinculoFilter = logisticaFilter = "todos";

    if (f === "ativo" || f === "pausado") statusFilter = f;
    if (f === "vinculados" || f === "sem_vinculo") vinculoFilter = f;
    if (f === "full" || f === "me") logisticaFilter = f;

    render();
  };
});

busca.oninput = render;
filterStockPositive.onchange = render;

/* ================= FILTRAGEM ================= */
function getListaFiltrada() {
  let lista = [...anuncios];

  if (statusFilter !== "todos")
    lista = lista.filter(a => a.status === statusFilter);

  if (vinculoFilter === "vinculados")
    lista = lista.filter(a => a.sku);

  if (vinculoFilter === "sem_vinculo")
    lista = lista.filter(a => !a.sku);

  if (logisticaFilter === "full")
    lista = lista.filter(a => a.is_full);

  if (logisticaFilter === "me")
    lista = lista.filter(a => !a.is_full);

  if (filterStockPositive.checked)
    lista = lista.filter(a => Number(a.estoque_ml) > 0);

  const termo = busca.value.toLowerCase();
  return lista.filter(a =>
    `${a.ml_item_id} ${a.titulo} ${a.seller_sku || ""} ${a?.sku?.sku_codigo || ""}`
      .toLowerCase()
      .includes(termo)
  );
}

/* ================= RENDER ================= */
function render() {
  const lista = getListaFiltrada();
  tbody.innerHTML = "";

  if (!lista.length) {
    tbody.innerHTML = `<tr><td colspan="8">Nenhum anúncio encontrado</td></tr>`;
    countValue.textContent = "0";
    return;
  }

  lista.forEach(a => {
    const tr = document.createElement("tr");

    let acao = "—";
    if (a.sku) {
      acao = `<button class="btn-link" data-unlink="${a.ml_item_id}">Desvincular</button>`;
    } else {
      acao = `<button class="btn-link" data-link="${a.ml_item_id}">Vincular</button>`;
    }

    tr.innerHTML = `
      <td>${a.ml_item_id}</td>
      <td>${a.titulo}</td>
      <td>${a.tipo_anuncio}</td>
      <td>${a.is_full ? "FULL" : "Mercado Envios"}</td>
      <td>${a.status}</td>
      <td>${a.estoque_ml}</td>
      <td>${a?.sku?.sku_codigo ?? "—"}</td>
      <td>${acao}</td>
    `;
    tbody.appendChild(tr);
  });

  countValue.textContent = lista.length;
}

/* ================= AÇÕES ================= */
tbody.onclick = async e => {
  const link = e.target.dataset.link;
  const unlink = e.target.dataset.unlink;

  try {
    if (link) {
      showToast("Vinculando automaticamente...");
      await apiPost("/ml/sincronizar-anuncios");
      await boot();
      showToast("Vínculo realizado com sucesso");
    }

    if (unlink) {
      await apiPost("/anuncios/desvincular", { ml_item_id: unlink });
      await boot();
      showToast("Anúncio desvinculado");
    }
  } catch {
    showToast("Erro ao executar ação", "error");
  }
};

/* ================= SYNC ================= */
btnSync.onclick = async () => {
  try {
    btnSync.disabled = true;
    btnSync.textContent = "Atualizando...";
    showToast("Sincronização iniciada...");
    await apiPost("/ml/sincronizar-anuncios");
    await boot();
    showToast("Anúncios atualizados com sucesso");
  } catch {
    showToast("Falha ao atualizar anúncios", "error");
  } finally {
    btnSync.textContent = "Atualizar anúncios";
    btnSync.disabled = false;
  }
};

/* ================= BOOT ================= */
async function boot() {
  anuncios = await apiGet("/ml/anuncios");
  lastSyncLabel.textContent = calcLastSync();
  render();
}

boot();
