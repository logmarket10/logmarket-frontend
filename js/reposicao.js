import { renderLayout } from "./layout.js";
import { apiGet, apiPost } from "./api.js";
import { requireAuth } from "./guard.js";

requireAuth();
renderLayout("reposicao");

const page = document.getElementById("pageContent");

/* =========================
   CONFIGURAÇÕES
========================= */
let DIAS_COMPRA = 30;
const LEAD_TIME = 15;
const ESTOQUE_SEGURANCA = 7;

/* =========================
   TEMPLATE
========================= */
page.innerHTML = `
<section class="pagebar reposicao-pagebar">

  <div class="reposicao-top-row">
    <h1 class="pagebar-title">Reposição</h1>

    <input id="buscaReposicao" class="search-input reposicao-search"
      placeholder="Buscar por SKU ou produto..." />

    <select id="diasCompra" class="dias-select">
      <option value="15">Comprar 15 dias</option>
      <option value="30" selected>Comprar 30 dias</option>
      <option value="45">Comprar 45 dias</option>
      <option value="60">Comprar 60 dias</option>
    </select>

    <button id="btnReprocessar" class="btn btn-primary">
      Processar vendas
    </button>
  </div>

  <div class="reposicao-bottom-row">
    <div class="filter-buttons" id="statusButtons">
      <button data-status="todos" class="active">Todos</button>
      <button data-status="repor">Repor</button>
      <button data-status="ok">OK</button>
    </div>

    <div class="pagebar-last-sync" id="metaInfo">
      Período processado: —
      <br/>
      <small>Referência visual: últimos ~30 dias</small>
    </div>

    <div class="export-buttons">
      <button id="btnExcel" class="btn btn-muted">Excel</button>
      <button id="btnPdf" class="btn btn-muted">PDF</button>
    </div>
  </div>
</section>

<div class="reposicao-kpis">
  <div class="kpi">
    <span>SKUs</span>
    <strong id="kpiSkus">0</strong>
  </div>
  <div class="kpi danger">
    <span>Para repor</span>
    <strong id="kpiRepor">0</strong>
  </div>
  <div class="kpi">
    <span>Vendidos</span>
    <strong id="kpiVendidos">0</strong>
  </div>
</div>

<div class="table-wrap">
<table id="reposicaoTable">
<thead>
<tr>
  <th>SKU</th>
  <th>Produto</th>
  <th>Estoque</th>
  <th>Vendidos</th>
  <th>Saldo</th>
  <th>Estoque mínimo</th>
  <th>
    Sugestão de compra
    <span class="info-icon" id="infoSugestao">ℹ</span>
  </th>
  <th>Status</th>
</tr>
</thead>
<tbody id="tabelaBody"></tbody>
</table>
</div>

<div id="modalSugestao" class="modal hidden">
  <div class="modal-box">
    <h3>Cálculo da sugestão de compra</h3>
    <p>
      Média diária = Vendidos / 30<br/>
      <br/>
      Sugestão = Média diária × (Dias de compra + Lead time + Estoque segurança)
      <br/><br/>
      Lead time: ${LEAD_TIME} dias<br/>
      Estoque segurança: ${ESTOQUE_SEGURANCA} dias
    </p>
    <button class="btn btn-primary" id="fecharModal">OK</button>
  </div>
</div>
`;

/* =========================
   TOAST
========================= */
function showToast(t, m, type = "info") {
  document.getElementById("toastTitle").textContent = t;
  document.getElementById("toastMessage").textContent = m;
  const overlay = document.getElementById("toastOverlay");
  overlay.classList.remove("hidden");

  document.getElementById("toastOk").onclick = () =>
    overlay.classList.add("hidden");

  if (type !== "loading") {
    setTimeout(() => overlay.classList.add("hidden"), 1800);
  }
}

/* =========================
   ESTADO
========================= */
const tbody = document.getElementById("tabelaBody");
const busca = document.getElementById("buscaReposicao");
const metaInfo = document.getElementById("metaInfo");

let lista = [];
let meta = null;
let statusAtual = "todos";

/* =========================
   CÁLCULO
========================= */
function calcularSugestao(r) {
  const media = (Number(r.vendido) || 0) / 30;
  const ideal = Math.ceil(media * (DIAS_COMPRA + LEAD_TIME + ESTOQUE_SEGURANCA));
  return Math.max(0, ideal - (Number(r.estoque) || 0));
}

/* =========================
   MODAL
========================= */
document.getElementById("infoSugestao").onclick = () =>
  document.getElementById("modalSugestao").classList.remove("hidden");

document.getElementById("fecharModal").onclick = () =>
  document.getElementById("modalSugestao").classList.add("hidden");

/* =========================
   DADOS
========================= */
async function carregarReposicao() {
  const resp = await apiGet("/reposicao");
  lista = resp?.data || resp || [];
  meta = resp?.meta || null;
}

/* =========================
   FILTROS
========================= */
function getListaFiltrada() {
  let l = [...lista];

  if (statusAtual === "repor") l = l.filter(r => calcularSugestao(r) > 0);
  if (statusAtual === "ok") l = l.filter(r => calcularSugestao(r) === 0);

  const termo = busca.value.toLowerCase();
  return l.filter(r => `${r.codigo} ${r.nome}`.toLowerCase().includes(termo));
}

/* =========================
   SALVAR ESTOQUE MÍNIMO (BLINDADO)
========================= */
async function salvarEstoqueMinimo(skuId, valor, valorAnterior) {
  // não salva se não mudou
  if (Number(valor) === Number(valorAnterior)) return { ok: true };

  try {
    await apiPost(`/sku/${skuId}/estoque-minimo`, { estoque_minimo: Number(valor) });
    return { ok: true };
  } catch (err) {
    // tenta extrair detail do backend
    const msg = (err?.detail) || (err?.message) || "Erro ao salvar estoque mínimo";
    return { ok: false, msg };
  }
}

/* =========================
   RENDER
========================= */
function render() {
  tbody.innerHTML = "";

  const visivel = getListaFiltrada();
  if (!visivel.length) {
    tbody.innerHTML = `<tr><td colspan="8">Nenhum registro encontrado</td></tr>`;
    document.getElementById("kpiSkus").textContent = String(lista.length || 0);
    document.getElementById("kpiVendidos").textContent = "0";
    document.getElementById("kpiRepor").textContent = "0";
    return;
  }

  let vendidos = 0;
  let repor = 0;

  visivel.forEach(r => {
    const sugestao = calcularSugestao(r);
    vendidos += Number(r.vendido) || 0;
    if (sugestao > 0) repor++;

    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${r.codigo}</td>
      <td>${r.nome}</td>
      <td>${r.estoque}</td>
      <td>${r.vendido}</td>
      <td>${r.saldo}</td>
      <td>
        <input class="cell-input" type="number" min="0" value="${r.estoque_minimo ?? 0}" />
      </td>
      <td><strong>${sugestao}</strong></td>
      <td>
        <span class="badge ${sugestao > 0 ? "inativo" : "ativo"}">
          ${sugestao > 0 ? "URGENTE" : "OK"}
        </span>
      </td>
    `;

    const input = tr.querySelector(".cell-input");

    // guarda valor anterior para comparação e rollback
    const anterior = Number(r.estoque_minimo ?? 0);
    input.dataset.prev = String(anterior);

    // salva no Enter também
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") input.blur();
    });

    input.onblur = async () => {
      const raw = input.value;
      const v = Number.parseInt(raw, 10);

      // não manda vazio / inválido
      if (raw === "" || Number.isNaN(v) || v < 0) {
        input.value = input.dataset.prev;
        return showToast("Atenção", "Informe um estoque mínimo válido (>= 0).");
      }

      // evita double-save (blur repetido)
      if (input.dataset.saving === "1") return;
      input.dataset.saving = "1";

      const prev = Number.parseInt(input.dataset.prev, 10) || 0;

      const res = await salvarEstoqueMinimo(r.sku_id, v, prev);
      input.dataset.saving = "0";

      if (!res.ok) {
        input.value = String(prev);
        return showToast("Erro ao salvar", res.msg);
      }

      // commit local
      r.estoque_minimo = v;
      input.dataset.prev = String(v);
      showToast("Salvo", "Estoque mínimo atualizado.");
    };

    tbody.appendChild(tr);
  });

  document.getElementById("kpiSkus").textContent = String(lista.length);
  document.getElementById("kpiVendidos").textContent = String(vendidos);
  document.getElementById("kpiRepor").textContent = String(repor);
}

/* =========================
   EXPORTAÇÃO (SÓ TABELA)
========================= */
document.getElementById("btnExcel").onclick = () => {
  let csv = "SKU;Produto;Estoque;Vendidos;Saldo;Estoque mínimo;Sugestão de compra\n";
  getListaFiltrada().forEach(r => {
    csv += `${r.codigo};"${String(r.nome).replaceAll('"', '""')}";${r.estoque};${r.vendido};${r.saldo};${r.estoque_minimo};${calcularSugestao(r)}\n`;
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "reposicao.csv";
  link.click();
};

document.getElementById("btnPdf").onclick = () => {
  document.body.classList.add("print-table-only");
  window.print();
  document.body.classList.remove("print-table-only");
};

/* =========================
   EVENTOS
========================= */
document.getElementById("diasCompra").onchange = (e) => {
  DIAS_COMPRA = Number(e.target.value);
  render();
};

document.querySelectorAll("#statusButtons button").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll("#statusButtons button")
      .forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    statusAtual = btn.dataset.status;
    render();
  };
});

busca.oninput = render;


/* =========================
   PROCESSAR VENDAS (BOTÃO)
========================= */

const btn = document.getElementById("btnReprocessar");

btn.onclick = async () => {
  if (btn.disabled) return;
  btn.disabled = true;

  try {
    showToast("Processando", "Processando vendas…", "loading");
    await apiPost("/ml/processar-vendas");
    await carregarReposicao();
    render();
    showToast("Concluído", "Vendas processadas.");
  } catch (e) {
    showToast("Erro", "Falha ao processar vendas.");
  } finally {
    btn.disabled = false;
  }
};


/* =========================
   BOOT
========================= */
async function boot() {
  await carregarReposicao();

  if (meta?.dt_from) {
    metaInfo.innerHTML = `
      Período processado: desde ${new Date(meta.dt_from).toLocaleString("pt-BR")}
      <br/>
      <small>Referência visual: últimos ~30 dias</small>
    `;
  } else {
    metaInfo.innerHTML = `
      Período processado: —
      <br/>
      <small>Referência visual: últimos ~30 dias</small>
    `;
  }

  render();
}

await boot();
