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

  <!-- LINHA 1 -->
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

  <!-- LINHA 2 -->
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
   TOAST (aceita objeto ou (titulo, msg))
========================= */
function showToast(arg1, arg2, arg3) {
  let title = "";
  let message = "";
  let type = "info";

  // Se veio como objeto: showToast({title, message, type})
  if (typeof arg1 === "object" && arg1 !== null) {
    title = arg1.title || "";
    message = arg1.message || "";
    type = arg1.type || "info";
  } else {
    // Se veio como showToast("Título", "Mensagem", "tipo")
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

  okBtn.onclick = null;
  okBtn.textContent = "OK";

  overlay.classList.remove("hidden");

  okBtn.onclick = () => overlay.classList.add("hidden");

  if (type === "loading") return;

  setTimeout(() => {
    overlay.classList.add("hidden");
  }, 1800);
}

/* =========================
   ELEMENTOS / ESTADO
========================= */
const tbody = document.getElementById("tabelaBody");
const busca = document.getElementById("buscaAnuncio");
const filterStockPositive = document.getElementById("filterStockPositive");
const statusButtons = document.getElementById("statusButtons");
const countValue = document.getElementById("countValue");
const checkAll = document.getElementById("checkAll");
const btnSync = document.getElementById("btnSync");
const lastSyncLabel = document.getElementById("lastSyncLabel");

const bulkBar = document.getElementById("bulkBar");
const bulkCount = document.getElementById("bulkCount");
const bulkSkuSelect = document.getElementById("bulkSkuSelect");
const bulkVincular = document.getElementById("bulkVincular");
const bulkDesvincular = document.getElementById("bulkDesvincular");
const bulkCancelar = document.getElementById("bulkCancelar");

let anuncios = [];
let skus = [];
let statusAtual = "todos";
let selecionados = new Set();

/* =========================
   FUNÇÕES AUXILIARES
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
   LOADER SKELETON
========================= */
function renderSkeleton(rows = 8) {
  tbody.innerHTML = "";
  for (let i = 0; i < rows; i++) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><div class="skeleton skeleton-checkbox"></div></td>
      <td><div class="skeleton skeleton-text"></div></td>
      <td><div class="skeleton skeleton-text long"></div></td>
      <td><div class="skeleton skeleton-text short"></div></td>
      <td><div class="skeleton skeleton-text short"></div></td>
      <td><div class="skeleton skeleton-text"></div></td>
      <td><div class="skeleton skeleton-btn"></div></td>
    `;
    tbody.appendChild(tr);
  }
}

/* =========================
   CARREGAMENTO
========================= */
async function carregarSkus() {
  skus = await apiGet("/sku");
}

async function carregarAnuncios() {
  anuncios = await apiGet("/ml/anuncios");
}

/* =========================
   SYNC
========================= */
btnSync.onclick = async () => {
  try {
    showToast("Atualizando", "Atualizando anúncios do Mercado Livre…", "loading");
    btnSync.disabled = true;
    renderSkeleton();

    await apiPost("/ml/anuncios/sync");
    setLastSyncNow();

    await carregarAnuncios();
    aplicarTudo();

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
function criarSelect(valor, disabled) {
  const s = document.createElement("select");
  s.disabled = disabled;
  s.innerHTML = `<option value="">Selecione o SKU</option>`;
  skus.forEach((k) => {
    const opt = document.createElement("option");
    opt.value = k.id;
    opt.textContent = `${k.codigo} - ${k.nome}`;
    if (String(valor) === String(k.id)) opt.selected = true;
    s.appendChild(opt);
  });
  return s;
}

function render(lista) {
  tbody.innerHTML = "";

  if (!lista.length) {
    tbody.innerHTML = `<tr><td colspan="7">Nenhum anúncio encontrado</td></tr>`;
    countValue.textContent = "0";
    atualizarBulkBar();
    return;
  }

  lista.forEach((a) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><input type="checkbox" class="row-check"></td>
      <td>${a.ml_item_id}</td>
      <td>${a.titulo}</td>
      <td>${a.status}</td>
      <td>${a.estoque_ml}</td>
      <td>${a?.sku?.sku_codigo ?? "—"}</td>
      <td></td>
    `;

    const chk = tr.querySelector(".row-check");
    chk.checked = selecionados.has(a.ml_item_id);
    chk.onchange = () => {
      chk.checked ? selecionados.add(a.ml_item_id) : selecionados.delete(a.ml_item_id);
      atualizarBulkBar();
    };

    const actions = document.createElement("div");
    actions.className = "actions";

    const select = criarSelect(a?.sku?.id, !!a.sku);

    if (a.sku) {
      const btnEditar = document.createElement("button");
      btnEditar.className = "btn btn-warning";
      btnEditar.textContent = "Editar";

      btnEditar.onclick = () => {
        select.disabled = false;
        btnEditar.textContent = "Salvar";
        btnEditar.className = "btn btn-primary";

        btnEditar.onclick = async () => {
          showToast("Salvando", "Salvando alterações…", "loading");
          await apiPost(`/sku/${select.value}/vincular`, { ml_item_id: a.ml_item_id });
          await boot();
          showToast("Sucesso", "Anúncio atualizado.");
        };
      };

      const btnDesv = document.createElement("button");
      btnDesv.className = "btn btn-muted";
      btnDesv.textContent = "Desvincular";

      btnDesv.onclick = async () => {
        if (btnDesv.classList.contains("loading")) return;

        // estado visual correto
        btnDesv.classList.add("loading");
        btnDesv.textContent = "Desvinculando…";
        btnDesv.style.cursor = "progress";
        btnDesv.style.pointerEvents = "none";

        showToast("Processando", "Desvinculando anúncio…", "loading");

        try {
          await apiPost("/anuncios/desvincular", {
            ml_item_id: a.ml_item_id
          });

          await boot();
          showToast("Desvinculado", "Anúncio desvinculado com sucesso.");
        } catch {
          showToast("Erro", "Falha ao desvincular anúncio.");
        } finally {
          // fallback de segurança
          btnDesv.classList.remove("loading");
          btnDesv.textContent = "Desvincular";
          btnDesv.style.cursor = "pointer";
          btnDesv.style.pointerEvents = "auto";
        }
      };

      actions.append(select, btnEditar, btnDesv);
    } else {
      const btn = document.createElement("button");
      btn.className = "btn btn-primary";
      btn.textContent = "Vincular";
      btn.onclick = async () => {
        if (!select.value) return showToast("Atenção", "Selecione um SKU.");
        showToast("Processando", "Vinculando anúncio…", "loading");
        await apiPost(`/sku/${select.value}/vincular`, { ml_item_id: a.ml_item_id });
        await boot();
        showToast("Sucesso", "Anúncio vinculado.");
      };

      actions.append(select, btn);
    }

    tr.lastElementChild.appendChild(actions);
    tbody.appendChild(tr);
  });

  countValue.textContent = String(lista.length);
  atualizarBulkBar();
}

/* =========================
   BULK
========================= */
checkAll.onchange = () => {
  selecionados.clear();
  if (checkAll.checked) getListaVisivel().forEach((a) => selecionados.add(a.ml_item_id));
  aplicarTudo();
};

function atualizarBulkBar() {
  if (selecionados.size >= 2) {
    bulkBar.classList.remove("hidden");
    bulkCount.textContent = selecionados.size;

    bulkSkuSelect.innerHTML = `<option value="">Selecione o SKU</option>`;
    skus.forEach((s) => {
      bulkSkuSelect.innerHTML += `<option value="${s.id}">${s.codigo} - ${s.nome}</option>`;
    });
  } else {
    bulkBar.classList.add("hidden");
  }
}

bulkCancelar.onclick = () => {
  selecionados.clear();
  checkAll.checked = false;
  aplicarTudo();
};

/* =========================
   PIPELINE
========================= */
function aplicarTudo() {
  render(getListaVisivel());
}

async function boot() {
  showToast("Carregando", "Carregando anúncios do Mercado Livre…", "loading");
  renderSkeleton();
  loadLastSync();
  await carregarSkus();
  await carregarAnuncios();
  aplicarTudo();
  document.getElementById("toastOverlay").classList.add("hidden");
}

await boot();
