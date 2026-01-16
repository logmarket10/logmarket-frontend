import { apiGet, apiPost } from "./api.js";
import { requireAuth } from "./guard.js";
import { renderLayout } from "./layout.js";

requireAuth();
renderLayout("anuncios");

const page = document.getElementById("pageContent");

page.innerHTML = `
<div class="anuncios-page">

  <div class="anuncios-header">
    <h1>Anúncios Mercado Livre</h1>

    <div class="anuncios-actions">
      <input id="searchInput" placeholder="Buscar anúncio..." />

      <select id="filterStatus">
        <option value="">Todos</option>
        <option value="ativo">Ativos</option>
        <option value="pausado">Pausados</option>
      </select>

      <select id="filterVinculo">
        <option value="">Todos</option>
        <option value="vinculado">Vinculados</option>
        <option value="sem-vinculo">Sem vínculo</option>
      </select>

      <select id="filterFull">
        <option value="">Todos</option>
        <option value="full">FULL</option>
        <option value="nao-full">Não FULL</option>
      </select>

      <button id="btnSync" class="btn-primary">
        Atualizar anúncios
      </button>
    </div>
  </div>

  <div class="anuncios-meta">
    Última atualização:
    <strong id="lastSyncLabel">—</strong>
  </div>

  <table class="anuncios-table">
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
   STATE
========================= */
let anuncios = [];

/* =========================
   HELPERS
========================= */
function formatDateSafe(value) {
  if (!value) return "—";
  const d = new Date(value);
  return isNaN(d.getTime()) ? "—" : d.toLocaleString("pt-BR");
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
      <td class="titulo">${a.titulo}</td>
      <td>${a.sku ? a.sku.sku_codigo : "—"}</td>
      <td>${a.tipo_anuncio}</td>
      <td>
        <span class="status ${a.status}">
          ${a.status}
        </span>
      </td>
      <td>${a.estoque_ml ?? "—"}</td>
      <td>
        ${a.is_full ? `<span class="badge-full">FULL</span>` : "—"}
      </td>
      <td>
        ${
          a.sku
            ? `<button class="btn-link danger" data-unlink="${a.ml_item_id}">Desvincular</button>`
            : `<button class="btn-link" data-link="${a.ml_item_id}">Vincular</button>`
        }
      </td>
    `;

    tbody.appendChild(tr);
  }

  const last = anuncios
    .map(a => a.atualizado_em)
    .filter(Boolean)
    .sort()
    .pop();

  document.getElementById("lastSyncLabel").textContent = formatDateSafe(last);

  tbody.querySelectorAll("[data-unlink]").forEach(btn => {
    btn.onclick = async () => {
      if (!confirm("Deseja desvincular este anúncio?")) return;
      await apiPost("/anuncios/desvincular", { ml_item_id: btn.dataset.unlink });
      await boot();
    };
  });
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
["searchInput", "filterStatus", "filterVinculo", "filterFull"]
  .forEach(id => document.getElementById(id).onchange = render);

/* =========================
   SYNC
========================= */
document.getElementById("btnSync").onclick = async () => {
  const { job_id } = await apiPost("/ml/sincronizar-anuncios");

  while (true) {
    await new Promise(r => setTimeout(r, 2000));
    const job = await apiGet(`/jobs/${job_id}`);
    if (job.status === "SUCESSO") break;
    if (job.status === "ERRO") return alert(job.erro);
  }

  await boot();
};

boot();
