import { apiGet, apiFetch } from "./api.js";
import { requireAuth } from "./guard.js";
import { renderLayout } from "./layout.js";

/* =========================
   AUTH + LAYOUT
========================= */
requireAuth();
renderLayout("skus");

const page = document.getElementById("pageContent");

/* =========================
   TEMPLATE BASE SKU
========================= */
page.innerHTML = `
<!-- PAGEBAR -->
<section class="pagebar skus-pagebar-final">
  <div class="skus-top-row">
    <h1 class="pagebar-title">SKUs</h1>

    <input
      id="buscaSku"
      class="search-input skus-search"
      placeholder="Buscar por código ou descrição..." />

        <div class="import-actions">
          <button class="btn btn-primary" id="btnImport" type="button">
            Importar CSV
          </button>

       <input type="file" id="importCsv" accept=".csv,.txt" hidden />

      <button
      class="btn btn-muted"
      id="btnVerModelo"
      type="button"
      title="Visualizar modelo de importação">
        Ver modelo CSV
  </button>

<!-- MODAL MODELO CSV -->
<div id="modeloModal" class="toast-overlay hidden">
  <div class="toast large">
    <h3>Modelo de Importação de SKUs</h3>

    <p class="hint">
      Utilize exatamente este formato. Separador: <strong>vírgula (,)</strong>
    </p>

    <div class="csv-preview">
            <pre>
      codigo,nome,estoque_central,estoque_minimo
      SKU001,Produto Exemplo 1,100,20
      SKU002,Produto Exemplo 2,50,10
            </pre>
          </div>

          <ul class="csv-rules">
            <li>• <strong>codigo</strong> não pode repetir</li>
            <li>• Estoques devem ser números ≥ 0</li>
            <li>• Arquivo deve ser CSV ou TXT</li>
          </ul>

          <div class="toast-actions">
            <button id="modeloClose" class="btn btn-primary">Fechar</button>
          </div>
        </div>
      </div>

      <div class="count-card">
      <span>Total de SKUs</span>
      <strong id="countValue">0</strong>
    </div>
  </div>
</section>

<!-- MODAL IMPORTAÇÃO -->
<div id="importModal" class="toast-overlay hidden">
  <div class="toast large">
    <h3>Pré-visualização de Importação</h3>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Linha</th>
            <th>SKU</th>
            <th>Descrição</th>
            <th>Estoque</th>
            <th>Mínimo</th>
            <th>Ação</th>
          </tr>
        </thead>
        <tbody id="previewBody"></tbody>
      </table>
    </div>

    <div class="toast-actions">
      <button id="importCancel" class="btn btn-muted">Cancelar</button>
      <button id="importConfirm" class="btn btn-primary">Importar</button>
    </div>
  </div>
</div>


    <div class="count-card">
      <span>Total de SKUs</span>
      <strong id="countValue">0</strong>
    </div>
  </div>
</section>

<!-- BULK BAR -->
<section id="bulkBar" class="anuncios-bulk hidden">
  <strong><span id="bulkCount">0</span> selecionados</strong>
  <div class="bulk-actions">
    <button id="bulkEdit" class="btn btn-warning">Editar</button>
    <button id="bulkDelete" class="btn btn-danger">Excluir</button>
    <button id="bulkCancel" class="btn btn-muted">Cancelar</button>
  </div>
</section>

<!-- FORM FIXO -->
<section class="skus-form-bar">
  <div class="form-card">
    <h3>Novo SKU</h3>

    <form id="skuForm" class="form-grid">
      <input name="codigo" class="ui-input" placeholder="Código SKU" required />
      <input name="nome" class="ui-input" placeholder="Descrição" required />
      <input name="estoque_central" type="number" class="ui-input" placeholder="Estoque central" required />
      <input name="estoque_minimo" type="number" class="ui-input" placeholder="Estoque mínimo" required />
      <button class="btn btn-primary" type="submit">Cadastrar SKU</button>
    </form>
  </div>
</section>

<!-- TABELA -->
<div class="table-wrap skus-table-wrap">
  <table id="skuTable">
    <thead>
      <tr>
        <th><input type="checkbox" id="checkAll"></th>
        <th data-sort="codigo">SKU</th>
        <th data-sort="nome">Descrição</th>
        <th data-sort="estoque_central">Estoque</th>
        <th data-sort="estoque_minimo">Estoque mínimo</th>
        <th>Ações</th>
      </tr>
    </thead>
    <tbody></tbody>
  </table>
</div>

<!-- TOAST -->
<div id="toastOverlay" class="toast-overlay hidden">
  <div class="toast">
    <h3 id="toastTitle"></h3>
    <p id="toastMessage"></p>
    <div class="toast-actions">
      <button id="toastCancel" class="btn btn-muted">Cancelar</button>
      <button id="toastConfirm" class="btn btn-danger">Excluir</button>
    </div>
  </div>
</div>

<!-- MODAL EDITAR -->
<div id="editModal" class="toast-overlay hidden">
  <div class="toast">
    <h3>Editar estoque</h3>

    <div class="form-field">
      <label>Estoque Central</label>
      <input id="editEstoque" type="number" class="ui-input" />
    </div>

    <div class="form-field">
      <label>Estoque mínimo</label>
      <input id="editMinimo" type="number" class="ui-input" />
    </div>

    <div class="toast-actions">
      <button id="editCancel" class="btn btn-muted">Cancelar</button>
      <button id="editSave" class="btn btn-primary">Salvar</button>
    </div>
  </div>
</div>
`;

/* =========================
   ELEMENTOS
========================= */
const tbody = document.querySelector("#skuTable tbody");
const busca = document.getElementById("buscaSku");
const countValue = document.getElementById("countValue");
const checkAll = document.getElementById("checkAll");

const bulkBar = document.getElementById("bulkBar");
const bulkCount = document.getElementById("bulkCount");
const bulkEdit = document.getElementById("bulkEdit");
const bulkDelete = document.getElementById("bulkDelete");
const bulkCancel = document.getElementById("bulkCancel");

const skuForm = document.getElementById("skuForm");

const toastOverlay = document.getElementById("toastOverlay");
const toastTitle = document.getElementById("toastTitle");
const toastMessage = document.getElementById("toastMessage");
const toastConfirm = document.getElementById("toastConfirm");
const toastCancel = document.getElementById("toastCancel");

const editModal = document.getElementById("editModal");
const editEstoque = document.getElementById("editEstoque");
const editMinimo = document.getElementById("editMinimo");
const editSave = document.getElementById("editSave");
const editCancel = document.getElementById("editCancel");

const btnImport = document.getElementById("btnImport");
const importCsv = document.getElementById("importCsv");
const importModal = document.getElementById("importModal");
const importCancel = document.getElementById("importCancel");
const importConfirm = document.getElementById("importConfirm");
const previewBody = document.getElementById("previewBody");


const btnVerModelo = document.getElementById("btnVerModelo");
const modeloModal = document.getElementById("modeloModal");
const modeloClose = document.getElementById("modeloClose");

btnVerModelo.onclick = () => {
  modeloModal.classList.remove("hidden");
};

modeloClose.onclick = () => {
  modeloModal.classList.add("hidden");
};
modeloModal.addEventListener("click", e => {
  if (e.target === modeloModal) {
    modeloModal.classList.add("hidden");
  }
});



/* =========================
   STATE
========================= */
let skus = [];
let selecionados = new Set();
let editIds = [];
let sortField = null;
let sortDir = "asc"; // asc | desc


/* =========================
   TOAST
========================= */
function showToast(title, message) {
  toastTitle.textContent = title;
  toastMessage.textContent = message;

  toastConfirm.style.display = "none";
  toastCancel.textContent = "OK";
  toastCancel.className = "btn btn-primary";

  toastCancel.onclick = () => toastOverlay.classList.add("hidden");
  toastOverlay.classList.remove("hidden");
}

/* =========================
   LOAD
========================= */
async function carregarSkus() {
  const dados = await apiGet("/sku");

  skus = dados.map(s => ({
    ...s,
    estoque_central:
      s.estoque_central ??
      s.estoque ??
      s.estoqueCentral ??
      0
  }));

  aplicarFiltro();
  countValue.textContent = skus.length;
}



/* =========================
   RENDER
========================= */
function render(lista) {
  tbody.innerHTML = "";

  lista.forEach(s => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td><input type="checkbox" class="rowCheck" data-id="${s.id}"></td>
      <td>${s.codigo}</td>
      <td>${s.nome}</td>
      <td>${s.estoque_central}</td>
      <td>${s.estoque_minimo}</td>
      <td>
        <button class="btn btn-warning btn-edit">Editar</button>
        <button class="btn btn-danger btn-delete">Excluir</button>
      </td>
    `;

    const chk = tr.querySelector(".rowCheck");
    chk.checked = selecionados.has(s.id);
    chk.onchange = () => {
      chk.checked ? selecionados.add(s.id) : selecionados.delete(s.id);
      atualizarBulk();
    };

    tr.querySelector(".btn-edit").onclick = () => abrirModal([s.id], s);
    tr.querySelector(".btn-delete").onclick = () => confirmarExclusao([s.id]);

    tbody.appendChild(tr);
  });

  atualizarBulk();
}

/* =========================
   FORMULARIO DE CADASTRO DE NOVO SKU
========================= */
skuForm.onsubmit = async e => {
  e.preventDefault();

  const data = Object.fromEntries(new FormData(skuForm));
  const submitBtn = skuForm.querySelector("button[type='submit']");

  // estado visual
  submitBtn.disabled = true;
  submitBtn.textContent = "Cadastrando...";

  try {
    await apiFetch("/sku", {
      method: "POST",
      body: JSON.stringify({
        codigo: data.codigo,
        nome: data.nome,
        estoque_central: Number(data.estoque_central),
        estoque_minimo: Number(data.estoque_minimo)
      })
    });

    skuForm.reset();
    await carregarSkus();
    showToast("Sucesso", "SKU cadastrado com sucesso.");

  } catch {
    showToast("Erro", "Erro ao cadastrar SKU.");
  } finally {
    // restaura botão
    submitBtn.disabled = false;
    submitBtn.textContent = "Cadastrar SKU";
  }
};

/* =========================
   BULK
========================= */
function atualizarBulk() {
  bulkBar.classList.toggle("hidden", selecionados.size === 0);
  bulkCount.textContent = selecionados.size;

  checkAll.checked = selecionados.size === skus.length && skus.length > 0;
  checkAll.indeterminate =
    selecionados.size > 0 && selecionados.size < skus.length;
}

checkAll.onchange = () => {
  selecionados.clear();
  if (checkAll.checked) skus.forEach(s => selecionados.add(s.id));
  aplicarFiltro();
};

bulkCancel.onclick = () => {
  selecionados.clear();
  aplicarFiltro();
};

bulkEdit.onclick = () => abrirModal([...selecionados]);
bulkDelete.onclick = () => confirmarExclusao([...selecionados]);

/* =========================
   MODAL
========================= */
function abrirModal(ids, sku = {}) {
  editIds = ids;
  editEstoque.value = sku.estoque_central ?? "";
  editMinimo.value = sku.estoque_minimo ?? "";
  editModal.classList.remove("hidden");
}

editCancel.onclick = () => editModal.classList.add("hidden");

editSave.onclick = async () => {
  editSave.disabled = true;
  editSave.textContent = "Salvando...";

  try {
    for (const id of editIds) {
      await apiFetch(`/sku/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          estoque_central: Number(editEstoque.value),
          estoque_minimo: Number(editMinimo.value)
        })
      });
    }

    editModal.classList.add("hidden");
    selecionados.clear();
    await carregarSkus();
    showToast("Sucesso", "Estoque atualizado com sucesso.");
  } finally {
    editSave.disabled = false;
    editSave.textContent = "Salvar";
  }
};

/* =========================
   DELETE
========================= */
function confirmarExclusao(ids) {
  toastTitle.textContent = "Confirmar exclusão";
  toastMessage.textContent =
    ids.length === 1
      ? "Deseja excluir este SKU?"
      : `Deseja excluir ${ids.length} SKUs?`;

  toastCancel.textContent = "Cancelar";
  toastCancel.className = "btn btn-muted";
  toastConfirm.style.display = "inline-flex";

  toastCancel.onclick = () => toastOverlay.classList.add("hidden");
  toastConfirm.onclick = async () => {
    toastOverlay.classList.add("hidden");
    for (const id of ids) await apiFetch(`/sku/${id}`, { method: "DELETE" });
    selecionados.clear();
    await carregarSkus();
    showToast("Sucesso", "SKU(s) excluído(s) com sucesso.");
  };

  toastOverlay.classList.remove("hidden");
}

/* =========================
   IMPORTAÇÃO
========================= */

let arquivoImportacao = null;
let possuiErrosImportacao = false;

btnImport.onclick = () => importCsv.click();

importCsv.onchange = async e => {
  arquivoImportacao = e.target.files[0];
  if (!arquivoImportacao) return;

  const fd = new FormData();
  fd.append("file", arquivoImportacao);

  const resp = await apiFetch("/sku/import/preview", {
    method: "POST",
    body: fd,
  });

  previewBody.innerHTML = "";
  possuiErrosImportacao = resp.erros && resp.erros.length > 0;

  resp.preview.forEach(p => {
    previewBody.innerHTML += `
      <tr>
        <td>${p.linha}</td>
        <td>${p.codigo}</td>
        <td>${p.nome}</td>
        <td>${p.estoque_central}</td>
        <td>${p.estoque_minimo}</td>
        <td>
          <span class="badge ${p.acao === "INSERIR" ? "green" : "blue"}">
            ${p.acao}
          </span>
        </td>
      </tr>
    `;
  });

  if (possuiErrosImportacao) {
    showToast(
      "Atenção",
      `${resp.erros.length} linha(s) com erro não serão importadas`
    );
  }

  importConfirm.disabled = possuiErrosImportacao;
  importModal.classList.remove("hidden");
};

importCancel.onclick = () => {
  importModal.classList.add("hidden");
  importCsv.value = ""; // reset
};

importConfirm.onclick = async () => {
  if (!arquivoImportacao || possuiErrosImportacao) return;

  // estado visual
  importConfirm.disabled = true;
  const originalText = importConfirm.textContent;
  importConfirm.textContent = "Importando...";

  try {
    const fd = new FormData();
    fd.append("file", arquivoImportacao);

    const r = await apiFetch("/sku/import/confirm", {
      method: "POST",
      body: fd,
    });

    showToast(
      "Importação concluída",
      `${r.inseridos} inseridos, ${r.atualizados} atualizados`
    );

    importModal.classList.add("hidden");
    importCsv.value = ""; // reset
    carregarSkus();

  } catch (err) {
    showToast("Erro", "Falha ao importar os SKUs.");
  } finally {
    // restaura botão
    importConfirm.disabled = false;
    importConfirm.textContent = originalText;
  }
};





/* =========================
   BUSCA
========================= */
busca.oninput = aplicarFiltro;

function aplicarFiltro() {
  const t = busca.value.toLowerCase();

  const filtrada = skus.filter(s =>
    `${s.codigo} ${s.nome}`.toLowerCase().includes(t)
  );

  render(ordenarLista(filtrada));
}


function ordenarLista(lista) {
  if (!sortField) return lista;

  return [...lista].sort((a, b) => {
    let v1 = a[sortField] ?? 0;
    let v2 = b[sortField] ?? 0;

    if (typeof v1 === "string") v1 = v1.toLowerCase();
    if (typeof v2 === "string") v2 = v2.toLowerCase();

    if (v1 < v2) return sortDir === "asc" ? -1 : 1;
    if (v1 > v2) return sortDir === "asc" ? 1 : -1;
    return 0;
  });
}



document.querySelectorAll("#skuTable thead th[data-sort]").forEach(th => {
  th.onclick = () => {
    const campo = th.dataset.sort;

    if (sortField === campo) {
      sortDir = sortDir === "asc" ? "desc" : "asc";
    } else {
      sortField = campo;
      sortDir = "asc";
    }

    // limpa indicadores
      document
      .querySelectorAll("#skuTable thead th[data-sort]")
      .forEach(h => {
        h.textContent = h.textContent.replace(" ▲", "").replace(" ▼", "");
      });

    // adiciona indicador
    th.textContent += sortDir === "asc" ? " ▲" : " ▼";

    aplicarFiltro();
  };
});


/* INIT */
carregarSkus();
