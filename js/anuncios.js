import { renderLayout } from "./layout.js";
import { apiGet, apiPost } from "./api.js";
import { requireAuth } from "./guard.js";

/* =========================
   BOOTSTRAP
========================= */
requireAuth();
renderLayout("anuncios");

const page = document.getElementById("pageContent");

/* =========================
   UI (DO ZERO)
========================= */
page.innerHTML = `
<div class="anuncios-page">

  <div class="anuncios-header">
    <div class="anuncios-title">
      <h1>Anúncios Mercado Livre</h1>
      <p class="subtitle">Controle operacional de anúncios, logística e vínculo com SKU</p>
    </div>

    <div class="anuncios-actions">
      <div class="search-wrap">
        <input id="buscaAnuncio" class="search-input" placeholder="Buscar por código, título, status ou SKU..." />
      </div>

      <button id="btnSync" class="btn-primary">
        <span class="btnText">Atualizar anúncios</span>
        <span class="btnSpinner" aria-hidden="true"></span>
      </button>
    </div>
  </div>

  <div class="anuncios-meta">
    <div class="last-sync">
      Última atualização:
      <strong id="lastSyncLabel">—</strong>
    </div>
  </div>

  <div class="anuncios-cards">
    <div class="card">
      <div class="card-label">Total</div>
      <div class="card-value" id="kpiTotal">0</div>
    </div>

    <div class="card">
      <div class="card-label">Ativos</div>
      <div class="card-value" id="kpiAtivos">0</div>
    </div>

    <div class="card">
      <div class="card-label">Pausados</div>
      <div class="card-value" id="kpiPausados">0</div>
    </div>

    <div class="card">
      <div class="card-label">FULL</div>
      <div class="card-value" id="kpiFull">0</div>
    </div>

    <div class="card">
      <div class="card-label">Sem vínculo</div>
      <div class="card-value" id="kpiSemVinculo">0</div>
    </div>
  </div>

  <div class="anuncios-table-wrap">
    <table class="anuncios-table">
      <thead>
        <tr>
          <th class="col-codigo">Código ML</th>
          <th>Anúncio</th>
          <th class="col-status">Status</th>
          <th class="col-full">FULL</th>
          <th class="col-estoque">Estoque</th>
          <th class="col-sku">SKU</th>
          <th class="col-acao">Ação</th>
        </tr>
      </thead>
      <tbody id="tabelaBody"></tbody>
    </table>
  </div>

</div>

<!-- Toast container -->
<div id="toastRoot" class="toast-root" aria-live="polite" aria-atomic="true"></div>
`;

/* =========================
   ELEMENTOS
========================= */
const tbody = document.getElementById("tabelaBody");
const busca = document.getElementById("buscaAnuncio");
const btnSync = document.getElementById("btnSync");
const lastSyncLabel = document.getElementById("lastSyncLabel");

const kpiTotal = document.getElementById("kpiTotal");
const kpiAtivos = document.getElementById("kpiAtivos");
const kpiPausados = document.getElementById("kpiPausados");
const kpiFull = document.getElementById("kpiFull");
const kpiSemVinculo = document.getElementById("kpiSemVinculo");

const toastRoot = document.getElementById("toastRoot");

/* =========================
   STATE
========================= */
let anuncios = [];
let termoBusca = "";

/* =========================
   HELPERS
========================= */
function formatDateBR(dt) {
  try {
    return new Date(dt).toLocaleString("pt-BR");
  } catch {
    return "—";
  }
}

function showToast(message, type = "info", timeoutMs = 2600) {
  // type: info | success | error
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <div class="toast-msg">${message}</div>
    <button class="toast-close" aria-label="Fechar">×</button>
  `;
  toastRoot.appendChild(toast);

  const close = () => {
    toast.classList.add("toast-hide");
    setTimeout(() => toast.remove(), 180);
  };

  toast.querySelector(".toast-close").onclick = close;
  setTimeout(close, timeoutMs);
}

function setSyncLoading(isLoading) {
  btnSync.disabled = isLoading;
  btnSync.classList.toggle("loading", isLoading);
  btnSync.querySelector(".btnText").textContent = isLoading ? "Atualizando..." : "Atualizar anúncios";
}

function calcLastSyncLabel(items) {
  // depende do backend devolver atualizado_em
  const dates = (items || [])
    .map(a => a.atualizado_em)
    .filter(Boolean)
    .map(d => new Date(d).getTime())
    .filter(n => Number.isFinite(n));

  if (!dates.length) return "—";
  return formatDateBR(new Date(Math.max(...dates)));
}

function getListaFiltrada() {
  const t = (termoBusca || "").trim().toLowerCase();
  if (!t) return anuncios;

  return anuncios.filter(a => {
    const sku = a?.sku?.sku_codigo ?? "";
    const txt = `${a.ml_item_id} ${a.titulo} ${a.status} ${sku}`.toLowerCase();
    return txt.includes(t);
  });
}

function updateKPIs(items) {
  const total = items.length;
  const ativos = items.filter(a => (a.status || "").toLowerCase() === "ativo").length;
  const pausados = items.filter(a => (a.status || "").toLowerCase() === "pausado").length;
  const full = items.filter(a => !!a.is_full).length;
  const semVinculo = items.filter(a => !a.sku).length;

  kpiTotal.textContent = total;
  kpiAtivos.textContent = ativos;
  kpiPausados.textContent = pausados;
  kpiFull.textContent = full;
  kpiSemVinculo.textContent = semVinculo;
}

function badgeStatus(status) {
  const s = (status || "").toLowerCase();
  if (s === "ativo") return `<span class="badge badge-ativo">Ativo</span>`;
  if (s === "pausado") return `<span class="badge badge-pausado">Pausado</span>`;
  return `<span class="badge badge-neutro">${status || "—"}</span>`;
}

function badgeFull(isFull) {
  return isFull
    ? `<span class="badge badge-full">FULL</span>`
    : `<span class="badge badge-neutro">—</span>`;
}

/* =========================
   ACTIONS: VINCULAR / DESVINCULAR
========================= */
async function desvincular(ml_item_id) {
  try {
    await apiPost("/anuncios/desvincular", { ml_item_id });
    showToast("Anúncio desvinculado com sucessoQUEucesso.", "success");
    await boot();
  } catch (e) {
    showToast("Falha ao desvincular anúncio.", "error");
  }
}

/**
 * Vincular automático:
 * - Recomendado ter um endpoint no backend que faça isso sozinho.
 * - Neste front, tentamos:
 *   1) /anuncios/vincular-auto (recomendado)
 *   2) Se não existir, mostramos instrução/erro.
 */
async function vincularAuto(ml_item_id) {
  try {
    await apiPost("/anuncios/vincular-auto", { ml_item_id });
    showToast("Vínculo realizado com sucesso.", "success");
    await boot();
  } catch (e) {
    showToast(
      "Não foi possível vincular automaticamente. Verifique se o endpoint /anuncios/vincular-auto está ativo.",
      "error",
      4200
    );
  }
}

/* =========================
   RENDER
========================= */
function render() {
  const lista = getListaFiltrada();
  tbody.innerHTML = "";

  if (!lista.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty">Nenhum anúncio encontrado</td></tr>`;
    updateKPIs([]);
    return;
  }

  updateKPIs(anuncios); // KPIs sempre do total carregado

  for (const a of lista) {
    const linkML = `https://produto.mercadolivre.com.br/${a.ml_item_id}`;
    const skuCodigo = a?.sku?.sku_codigo ?? "—";

    const acaoHtml = a.sku
      ? `<button class="btn-link danger" data-action="desvincular" data-id="${a.ml_item_id}">Desvincular</button>`
      : `<button class="btn-link" data-action="vincular" data-id="${a.ml_item_id}">Vincular</button>`;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="mono">${a.ml_item_id}</td>
      <td class="titulo">
        <a href="${linkML}" target="_blank" rel="noreferrer">${a.titulo || "—"}</a>
        <div class="sub">
          <span class="subchip">${a.tipo_anuncio || "—"}</span>
          <span class="subchip">${a.logistic_type || "—"}</span>
        </div>
      </td>
      <td>${badgeStatus(a.status)}</td>
      <td>${badgeFull(!!a.is_full)}</td>
      <td class="num">${Number(a.estoque_ml ?? 0)}</td>
      <td class="mono">${skuCodigo}</td>
      <td class="acao">${acaoHtml}</td>
    `;
    tbody.appendChild(tr);
  }

  // Delegação de eventos (ações)
  tbody.querySelectorAll("button[data-action]").forEach(btn => {
    btn.onclick = async () => {
      const action = btn.dataset.action;
      const id = btn.dataset.id;

      btn.disabled = true;
      try {
        if (action === "desvincular") await desvincular(id);
        if (action === "vincular") await vincularAuto(id);
      } finally {
        btn.disabled = false;
      }
    };
  });

  // Última atualização
  lastSyncLabel.textContent = calcLastSyncLabel(anuncios);
}

/* =========================
   SYNC (JOB + POLLING)
========================= */
async function pollJob(job_id, timeoutMs = 240000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const job = await apiGet(`/jobs/${job_id}`);
    const status = (job.status || "").toUpperCase();

    if (status === "SUCESSO") return job;
    if (status === "ERRO") throw new Error(job.erro || "Falha no job");

    await new Promise(r => setTimeout(r, 1200));
  }
  throw new Error("Timeout ao aguardar sincronização");
}

btnSync.onclick = async () => {
  try {
    setSyncLoading(true);

    // dispara sync
    const r = await apiPost("/ml/sincronizar-anuncios");
    const job_id = r?.job_id;

    if (!job_id) {
      showToast("Sincronização iniciada, mas não retornou job_id.", "error");
      return;
    }

    // aguarda terminar
    await pollJob(job_id);

    // recarrega
    await boot();

    showToast("Anúncios atualizados com sucesso.", "success");
  } catch (e) {
    showToast(`Falha ao atualizar anúncios: ${String(e.message || e)}`, "error", 4200);
  } finally {
    setSyncLoading(false);
  }
};

/* =========================
   BOOT
========================= */
async function boot() {
  anuncios = await apiGet("/ml/anuncios");
  termoBusca = (busca.value || "").trim();
  render();
}

busca.oninput = () => {
  termoBusca = (busca.value || "").trim();
  render();
};

// primeira carga
await boot();
