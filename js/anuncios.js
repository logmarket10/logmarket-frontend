import { apiGet, apiPost } from "./api.js";
import { requireAuth } from "./guard.js";
import { renderLayout } from "./layout.js";

/* =========================
   AUTH + LAYOUT
========================= */
requireAuth();
renderLayout("anuncios");

const page = document.getElementById("pageContent");

/* =========================
   TEMPLATE
========================= */
page.innerHTML = `
<div class="anuncios-page">

  <!-- PAGE BAR -->
  <section class="pagebar">
    <div class="pagebar-title">Anúncios Mercado Livre</div>

    <div class="pagebar-controls">
      <input id="searchInput" class="search-input" placeholder="Buscar anúncio..." />

      <select id="filterStatus" class="select">
        <option value="">Todos</option>
        <option value="ativo">Ativos</option>
        <option value="pausado">Pausados</option>
      </select>

      <select id="filterVinculo" class="select">
        <option value="">Todos</option>
        <option value="vinculado">Vinculados</option>
        <option value="sem-vinculo">Sem vínculo</option>
      </select>

      <select id="filterFull" class="select">
        <option value="">Todos</option>
        <option value="full">FULL</option>
        <option value="nao-full">Não FULL</option>
      </select>

      <button id="btnSync" class="btn-primary">
        Atualizar anúncios
      </button>
    </div>

    <div class="pagebar-info">
      Última atualização:
      <strong id="lastSyncLabel">—</strong>
    </div>
  </section>

  <!-- TABLE -->
  <table class="table">
    <thead>
      <tr>
        <th>Título</th>
        <th>SKU</th>
        <th>Tipo</th>
        <th>Status</th>
        <th>Estoque</th>
        <th>FULL</th>
        <th>Ação</th>
      </tr>
    </thead>
    <tbody id="tbody"></tbody>
  </table>

</div>
`;

/* =========================
   OVERLAY
========================= */
const overlay = document.createElement("div");
overlay.id = "syncOverlay";
overlay.style.cssText = `
  position: fixed;
  inset: 0;
  background: rgba(255,255,255,.85);
  display: none;
  align-items: center;
  justify-content: center;
  z-index: 9999;
`;
overlay.innerHTML = `
  <div style="text-align:center">
    <h2>Atualizando anúncios…</h2>
    <p>Aguarde, isso pode levar alguns minutos</p>
  </div>
`;
document.body.appendChild(overlay);

const showOverlay = () => overlay.style.display = "flex";
const hideOverlay = () => overlay.style.display = "none";

/* =========================
   STATE
========================= */
let anuncios = [];

/* =========================
   HELPERS
========================= */
function formatDate(dt) {
  return dt.toLocaleString("pt-BR");
}

function calcLastSync() {
  if (!anuncios.length) return "—";
  const max = Math.max(
    ...anuncios
      .filter(a => a.atualizado_em)
      .map(a => new Date(a.atualizado_em).getTime())
  );
  return max ? formatDate(new Date(max)) : "—";
}

/* =========================
   RENDER
========================= */
function render() {
  const tbody = document.getElementById("tbody");
  tbody.innerHTML = "";

  const search = document.getElementById("searchInput").value.toLowerCase();
  const status = document.getElementById("filterStatus").value;
  const vinculo = document.getElementById("filterVinculo").value;
  const full = document.getElementById("filterFull").value;

  const filtrados = anuncios.filter(a => {
    if (search && !a.titulo.toLowerCase().includes(search)) return false;
    if (status && a.status !== status) return false;

    if (vinculo === "vinculado" && !a.sku) return false;
    if (vinculo === "sem-vinculo" && a.sku) return false;

    if (full === "full" && !a.is_full) return false;
    if (full === "nao-full" && a.is_full) return false;

    return true;
  });

  for (const a of filtrados) {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${a.titulo}</td>
      <td>${a.sku ? a.sku.sku_codigo : "—"}</td>
      <td>${a.tipo_anuncio}</td>
      <td>${a.status}</td>
      <td>${a.estoque_ml ?? "—"}</td>
      <td>${a.is_full ? "✔" : "—"}</td>
      <td>
        ${
          a.sku
            ? `<button class="btn-link" data-unlink="${a.ml_item_id}">Desvincular</button>`
            : `<button class="btn-link" data-link="${a.ml_item_id}">Vincular</button>`
        }
      </td>
    `;

    tbody.appendChild(tr);
  }

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

  document.getElementById("lastSyncLabel").textContent = calcLastSync();
}

/* =========================
   LOAD
========================= */
async function boot() {
  anuncios = await apiGet("/ml/anuncios");
  render();
}

/* =========================
   EVENTS
========================= */
document.getElementById("searchInput").oninput = render;
document.getElementById("filterStatus").onchange = render;
document.getElementById("filterVinculo").onchange = render;
document.getElementById("filterFull").onchange = render;

/* =========================
   SYNC
========================= */
document.getElementById("btnSync").onclick = async () => {
  try {
    showOverlay();

    const { job_id } = await apiPost("/ml/sincronizar-anuncios");

    while (true) {
      await new Promise(r => setTimeout(r, 2000));
      const job = await apiGet(`/jobs/${job_id}`);

      if (job.status === "SUCESSO") break;
      if (job.status === "ERRO") throw new Error(job.erro);
    }

    await boot();

  } catch (e) {
    alert("Falha ao atualizar anúncios");
    console.error(e);
  } finally {
    hideOverlay();
  }
};

/* =========================
   INIT
========================= */
boot();
