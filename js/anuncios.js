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

    <button id="btnSync" class="btn btn-primary">Atualizar anúncios</button>

    <div class="count-card">
      <span>Total</span>
      <strong id="countValue">0</strong>
    </div>
  </div>
</section>

<div class="table-wrap anuncios-table-wrap">
  <table id="tabelaAnuncios">
    <thead>
      <tr>
        <th>Código ML</th>
        <th>Anúncio</th>
        <th>Tipo</th>
        <th>Status</th>
        <th>Estoque ML</th>
        <th>SKU</th>
        <th>Ação</th>
      </tr>
    </thead>
    <tbody id="tabelaBody"></tbody>
  </table>
</div>
`;

/* =========================
   ESTADO
========================= */
let anuncios = [];
let skus = [];
let statusAtual = "todos";

/* =========================
   ELEMENTOS
========================= */
const tbody = document.getElementById("tabelaBody");
const busca = document.getElementById("buscaAnuncio");
const filterStockPositive = document.getElementById("filterStockPositive");
const statusButtons = document.getElementById("statusButtons");
const countValue = document.getElementById("countValue");
const btnSync = document.getElementById("btnSync");
const lastSyncLabel = document.getElementById("lastSyncLabel");

/* =========================
   UTIL
========================= */
function showToast(title, msg, type = "info") {
  alert(`${title}\n${msg}`);
}

function formatDate(dt) {
  return dt.toLocaleString("pt-BR");
}

function loadLastSync() {
  const v = localStorage.getItem("ml_last_sync");
  if (v) lastSyncLabel.textContent = formatDate(new Date(v));
}

/* =========================
   SKU SEARCH (INPUT + DROPDOWN)
========================= */
function criarSkuSearch(onSelect) {
  const wrap = document.createElement("div");
  wrap.className = "sku-search";

  const input = document.createElement("input");
  input.placeholder = "Buscar SKU...";
  input.className = "search-input";

  const list = document.createElement("div");
  list.className = "sku-search-list hidden";

  input.oninput = () => {
    const termo = input.value.toLowerCase();
    list.innerHTML = "";

    skus
      .filter((s) =>
        `${s.codigo} ${s.nome}`.toLowerCase().includes(termo)
      )
      .forEach((s) => {
        const item = document.createElement("div");
        item.textContent = `${s.codigo} - ${s.nome}`;
        item.onclick = () => {
          input.value = `${s.codigo} - ${s.nome}`;
          list.classList.add("hidden");
          onSelect(s.id);
        };
        list.appendChild(item);
      });

    list.classList.remove("hidden");
  };

  wrap.append(input, list);
  return wrap;
}

/* =========================
   FILTRO
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
  if (["ativo", "pausado"].includes(statusAtual)) lista = lista.filter((a) => a.status === statusAtual);
  if (filterStockPositive.checked) lista = lista.filter((a) => Number(a.estoque_ml) > 0);

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
      <td>${a.ml_item_id}</td>
      <td>${a.titulo}</td>
      <td>
        <span class="badge ${a.tipo_anuncio === "CATALOGO" ? "badge-catalogo" : "badge-lista"}">
          ${a.tipo_anuncio}
        </span>
      </td>
      <td>${a.status}</td>
      <td>${a.estoque_ml}</td>
      <td>
        ${a?.sku?.sku_codigo || "—"}
        ${
          a.origem_vinculo
            ? `<span class="badge ${a.origem_vinculo === "AUTO" ? "badge-auto" : "badge-manual"}">
                 ${a.origem_vinculo}
               </span>`
            : ""
        }
      </td>
      <td></td>
    `;

    const actions = document.createElement("div");

    if (!a.sku) {
      let skuSelecionado = null;

      const search = criarSkuSearch((id) => (skuSelecionado = id));

      const btn = document.createElement("button");
      btn.className = "btn btn-primary";
      btn.textContent = "Vincular";

      btn.onclick = async () => {
        if (!skuSelecionado) return showToast("Atenção", "Selecione um SKU.");

        showToast("Processando", "Vinculando anúncio…");
        await apiPost(`/sku/${skuSelecionado}/vincular`, {
          ml_item_id: a.ml_item_id
        });
        await boot();
      };

      actions.append(search, btn);
    } else {
      const btnDesv = document.createElement("button");
      btnDesv.className = "btn btn-muted";
      btnDesv.textContent = "Desvincular";

      btnDesv.onclick = async () => {
        showToast("Processando", "Desvinculando anúncio…");
        await apiPost("/anuncios/desvincular", { ml_item_id: a.ml_item_id });
        await boot();
      };

      actions.append(btnDesv);
    }

    tr.lastElementChild.appendChild(actions);
    tbody.appendChild(tr);
  });

  countValue.textContent = String(lista.length);
}

/* =========================
   LOAD
========================= */
async function carregarSkus() {
  skus = await apiGet("/sku");
}

async function carregarAnuncios() {
  anuncios = await apiGet("/ml/anuncios");
}

async function boot() {
  loadLastSync();
  await carregarSkus();
  await carregarAnuncios();
  aplicarTudo();
}

function aplicarTudo() {
  render(getListaVisivel());
}

/* =========================
   SYNC
========================= */
btnSync.onclick = async () => {
  showToast("Atualizando", "Atualizando anúncios…");
  await apiPost("/ml/anuncios/sync");
  localStorage.setItem("ml_last_sync", new Date().toISOString());
  await boot();
};

await boot();
