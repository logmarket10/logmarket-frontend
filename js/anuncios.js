import { renderLayout } from "./layout.js";
import { apiGet, apiPost } from "./api.js";
import { requireAuth } from "./guard.js";

requireAuth();
renderLayout("anuncios");

const page = document.getElementById("pageContent");

/* =========================
   STATE
========================= */
let anuncios = [];
let skus = [];

let statusFilter = "todos";     // todos | ativo | pausado
let vinculoFilter = "todos";    // todos | vinculados | sem_vinculo
let logisticaFilter = "todos";  // todos | full | me

let selecionados = new Set();

/* =========================
   HELPERS
========================= */
const formatDate = (d) => d.toLocaleString("pt-BR");

function getLastUpdateFromData() {
  if (!anuncios.length) return "—";
  const max = Math.max(...anuncios.map(a => new Date(a.atualizado_em).getTime()));
  return formatDate(new Date(max));
}

/* =========================
   FILTRO CENTRAL
========================= */
function getListaFiltrada() {
  let lista = [...anuncios];

  // status
  if (statusFilter !== "todos") {
    lista = lista.filter(a => a.status === statusFilter);
  }

  // vínculo
  if (vinculoFilter === "vinculados") {
    lista = lista.filter(a => a.sku);
  }
  if (vinculoFilter === "sem_vinculo") {
    lista = lista.filter(a => !a.sku);
  }

  // logística
  if (logisticaFilter === "full") {
    lista = lista.filter(a => a.is_full);
  }
  if (logisticaFilter === "me") {
    lista = lista.filter(a => !a.is_full);
  }

  return lista;
}

/* =========================
   RENDER
========================= */
function renderTabela(lista) {
  const tbody = document.getElementById("tabelaBody");
  tbody.innerHTML = "";

  if (!lista.length) {
    tbody.innerHTML = `<tr><td colspan="9">Nenhum anúncio encontrado</td></tr>`;
    return;
  }

  lista.forEach(a => {
    const linkML = `https://produto.mercadolivre.com.br/${a.ml_item_id}`;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><input type="checkbox" /></td>
      <td>${a.ml_item_id}</td>
      <td>
        <a href="${linkML}" target="_blank">${a.titulo}</a>
      </td>
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
      <td><!-- ações --></td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById("countValue").textContent = lista.length;
}

/* =========================
   EVENTOS DE FILTRO
========================= */
document.querySelectorAll("[data-status]").forEach(btn => {
  btn.onclick = () => {
    statusFilter = btn.dataset.status;
    aplicar();
  };
});

document.getElementById("filterVinculados").onclick = () => {
  vinculoFilter = "vinculados";
  aplicar();
};

document.getElementById("filterSemVinculo").onclick = () => {
  vinculoFilter = "sem_vinculo";
  aplicar();
};

document.getElementById("filterFull").onclick = () => {
  logisticaFilter = "full";
  aplicar();
};

document.getElementById("filterME").onclick = () => {
  logisticaFilter = "me";
  aplicar();
};

/* =========================
   SYNC
========================= */
document.getElementById("btnSync").onclick = async () => {
  try {
    await apiPost("/ml/sincronizar-anuncios");
    await boot();
  } catch {
    alert("Falha ao atualizar anúncios");
  }
};

/* =========================
   BOOT
========================= */
async function boot() {
  anuncios = await apiGet("/ml/anuncios");
  skus = await apiGet("/sku");

  document.getElementById("lastSyncLabel").textContent = getLastUpdateFromData();
  aplicar();
}

function aplicar() {
  renderTabela(getListaFiltrada());
}

await boot();
