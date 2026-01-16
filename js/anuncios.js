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
   STATE
========================= */
let anuncios = [];
let lastJobId = null;

/* =========================
   ELEMENTOS
========================= */
const tbody = document.getElementById("tabelaBody");
const busca = document.getElementById("buscaAnuncio");
const countValue = document.getElementById("countValue");
const lastSyncLabel = document.getElementById("lastSyncLabel");
const filterStockPositive = document.getElementById("filterStockPositive");
const btnSync = document.getElementById("btnSync");

/* =========================
   OVERLAY (MENSAGEM CENTRAL)
========================= */
function showOverlay(msg) {
  let el = document.getElementById("overlaySync");
  if (!el) {
    el = document.createElement("div");
    el.id = "overlaySync";
    el.style = `
      position: fixed;
      inset: 0;
      background: rgba(255,255,255,.75);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      font-size: 18px;
      font-weight: 600;
      color: #4f46e5;
    `;
    document.body.appendChild(el);
  }
  el.textContent = msg;
}

function hideOverlay() {
  const el = document.getElementById("overlaySync");
  if (el) el.remove();
}

/* =========================
   FILTROS (MANTÉM SEU PADRÃO)
========================= */
let statusFilter = "todos";
let vinculoFilter = "todos";
let logisticaFilter = "todos";

document.querySelectorAll("#statusButtons button").forEach(btn => {
  btn.onclick = () => {
    document
      .querySelectorAll("#statusButtons button")
      .forEach(b => b.classList.remove("active"));

    btn.classList.add("active");

    const f = btn.dataset.filter;

    statusFilter = "todos";
    vinculoFilter = "todos";
    logisticaFilter = "todos";

    if (f === "ativo" || f === "pausado") statusFilter = f;
    if (f === "vinculados" || f === "sem_vinculo") vinculoFilter = f;
    if (f === "full" || f === "me") logisticaFilter = f;

    render();
  };
});

busca.oninput = render;
filterStockPositive.onchange = render;

/* =========================
   FILTRAGEM
========================= */
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
    `${a.ml_item_id} ${a.titulo} ${a.status} ${a.seller_sku || ""} ${a?.sku?.sku_codigo || ""}`
      .toLowerCase()
      .includes(termo)
  );
}

/* =========================
   RENDER (TABELA)
========================= */
function render() {
  const lista = getListaFiltrada();
  tbody.innerHTML = "";

  if (!lista.length) {
    tbody.innerHTML = `<tr><td colspan="8">Nenhum anúncio encontrado</td></tr>`;
    countValue.textContent = "0";
    return;
  }

  lista.forEach(a => {
    const linkML = `https://produto.mercadolivre.com.br/${a.ml_item_id}`;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${a.ml_item_id}</td>
      <td><a href="${linkML}" target="_blank">${a.titulo}</a></td>
      <td>
        <span class="badge ${a.tipo_anuncio === "CATALOGO" ? "badge-catalogo" : "badge-lista"}">
          ${a.tipo_anuncio}
        </span>
      </td>
      <td>
        <span class="badge ${a.is_full ? "badge-auto" : "badge-manual"}">
          ${a.is_full ? "FULL" : "Mercado Envios"}
        </span>
      </td>
      <td>${a.status}</td>
      <td>${a.estoque_ml}</td>
      <td>${a?.sku?.sku_codigo ?? "—"}</td>
      <td>
        ${
          a.sku
            ? `<button class="btn-link danger" data-unlink="${a.ml_item_id}">Desvincular</button>`
            : `<button class="btn-link" data-link="${a.ml_item_id}">Vincular</button>`
        }
      </td>
    `;
    tbody.appendChild(tr);
  });

  countValue.textContent = lista.length;

  // ações
  tbody.querySelectorAll("[data-unlink]").forEach(btn => {
    btn.onclick = async () => {
      if (!confirm("Deseja desvincular este anúncio?")) return;
      await apiPost("/anuncios/desvincular", {
        ml_item_id: btn.dataset.unlink
      });
      await boot();
    };
  });
}

/* =========================
   SYNC (BOTÃO ATUALIZAR)
========================= */
btnSync.onclick = async () => {
  try {
    btnSync.disabled = true;
    showOverlay("Atualizando anúncios…");

    const { job_id } = await apiPost("/ml/sincronizar-anuncios");
    lastJobId = job_id;

    await acompanharJob(job_id);

    await boot();
  } catch (e) {
    alert("Falha ao atualizar anúncios");
  } finally {
    hideOverlay();
    btnSync.disabled = false;
  }
};

/* =========================
   ACOMPANHA JOB
========================= */
async function acompanharJob(jobId) {
  while (true) {
    await new Promise(r => setTimeout(r, 2000));
    const job = await apiGet(`/jobs/${jobId}`);

    if (job.status === "SUCESSO") {
      if (job.finalizado_em) {
        lastSyncLabel.textContent =
          new Date(job.finalizado_em).toLocaleString("pt-BR");
      }
      return;
    }

    if (job.status === "ERRO") {
      throw new Error(job.erro);
    }
  }
}

/* =========================
   BOOT
========================= */
async function boot() {
  anuncios = await apiGet("/ml/anuncios");
  render();
}

boot();
