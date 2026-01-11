import { apiGet } from "./api.js";
import { requireAuth } from "./guard.js";
import { renderLayout } from "./layout.js";

requireAuth();
renderLayout("ruptura");

const page = document.getElementById("pageContent");

page.innerHTML = `
  <section class="pagebar">
    <div class="pagebar-title">Ruptura de Anúncios</div>

    <div class="pagebar-controls">
      <input id="filtroSku" class="search-input" placeholder="Filtrar por SKU" />
      <input id="filtroDescricao" class="search-input" placeholder="Filtrar por descrição" />
    </div>
  </section>

  <main class="content ruptura-content">
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Status</th>
            <th>SKU</th>
            <th>Descrição</th>
            <th>Anúncios vinculados</th>
            <th>Estoque dos anúncios</th>
            <th>Ação recomendada</th>
          </tr>
        </thead>
        <tbody id="tabelaRuptura"></tbody>
      </table>
    </div>
  </main>
`;


const tbody = document.getElementById("tabelaRuptura");
const filtroSku = document.getElementById("filtroSku");
const filtroDescricao = document.getElementById("filtroDescricao");

let dados = [];

/* =========================
   LOAD
========================= */
async function carregar() {
  const anuncios = await apiGet("/ml/anuncios");

  const grupos = {};

  anuncios.forEach(a => {
    if (!a.sku) return;

    const skuCodigo = a.sku.sku_codigo;
    const skuNome = a.sku.sku_nome;
    const estoqueCentral = Number(a.sku.estoque_central ?? 0);

    if (!grupos[skuCodigo]) {
      grupos[skuCodigo] = {
        sku: skuCodigo,
        descricao: skuNome,
        estoqueCentral,
        anuncios: []
      };
    }

    grupos[skuCodigo].anuncios.push(a);
  });

  dados = Object.values(grupos)
    .map(g => {
      const zerado = g.anuncios.some(a => Number(a.estoque_ml) === 0);
      const alerta = g.anuncios.some(
        a => Number(a.estoque_ml) > 0 && Number(a.estoque_ml) <= g.estoqueCentral
      );

      if (!zerado && !alerta) return null;

      return {
        ...g,
        status: zerado ? "ruptura" : "alerta"
      };
    })
    .filter(Boolean);

  renderizar(dados);
}

/* =========================
   RENDER
========================= */
function renderizar(lista) {
  tbody.innerHTML = "";

  if (!lista.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center">
          Nenhuma ruptura ou alerta encontrado
        </td>
      </tr>
    `;
    return;
  }

  lista.forEach(r => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>
        <span class="status-dot ${
          r.status === "ruptura" ? "status-red" : "status-orange"
        }"></span>
      </td>

      <td>${r.sku}</td>

      <td>${r.descricao}</td>

      <td>${r.anuncios.length}</td>

      <td class="estoque-list">
        ${r.anuncios
          .map(a => `${a.titulo}: ${a.estoque_ml}`)
          .join("<br>")}
      </td>

      <td>
        ${
          r.status === "ruptura"
            ? "Anúncio zerado. Revisar reposição imediatamente."
            : "Estoque próximo do limite do SKU. Antecipar reposição."
        }
      </td>
    `;

    tbody.appendChild(tr);
  });
}

/* =========================
   FILTROS
========================= */
function aplicarFiltros() {
  const s = filtroSku.value.toLowerCase();
  const d = filtroDescricao.value.toLowerCase();

  renderizar(
    dados.filter(r =>
      r.sku.toLowerCase().includes(s) &&
      r.descricao.toLowerCase().includes(d)
    )
  );
}

filtroSku.oninput = aplicarFiltros;
filtroDescricao.oninput = aplicarFiltros;

/* INIT */
await carregar();
