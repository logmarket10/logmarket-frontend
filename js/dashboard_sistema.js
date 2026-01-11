import { requireSuperAdmin } from "./guard.js";
import { renderLayoutSistema } from "./layout_sistema.js";
import { abrirModal, fecharModal, showMessage } from "./ui.js";
import { apiGet, apiPost, apiPut } from "./api.js";

/* =========================
   BOOT
========================= */
requireSuperAdmin();
renderLayoutSistema();

const empresasList = document.getElementById("empresasList");
const btnNovaEmpresa = document.getElementById("btnNovaEmpresa");

/* =========================
   HELPERS
========================= */
function escapeHtml(s = "") {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* =========================
   LISTAR EMPRESAS
========================= */
async function carregarEmpresas() {
  try {
    const empresas = await apiGet("/empresas");

    empresasList.innerHTML = empresas.map(e => `
      <div class="empresa-card">
        <div>
          <strong>${escapeHtml(e.nome)}</strong><br/>
          <span class="text-muted">${e.ativo ? "Ativa" : "Inativa"}</span>
        </div>

        <div class="actions">
          <button class="btn-secondary"
            onclick="toggleEmpresa(${e.id}, ${e.ativo})">
            ${e.ativo ? "Inativar" : "Ativar"}
          </button>

          <button class="btn-primary"
            onclick="abrirModalAdmins(${e.id}, '${String(e.nome).replace(/'/g, "\\'")}')">
            Administradores
          </button>
        </div>
      </div>
    `).join("");

  } catch {
    showMessage("Erro ao carregar empresas", "Erro");
  }
}

carregarEmpresas();

/* =========================
   ATIVAR / INATIVAR EMPRESA
========================= */
window.toggleEmpresa = (empresaId, ativoAtual) => {
  const acao = ativoAtual ? "inativar" : "ativar";

  abrirModal(`
    <h3>Confirmar ação</h3>
    <p>Deseja ${acao} esta empresa?</p>

    <div class="modal-actions">
      <button class="btn-secondary" id="cancelToggle">Cancelar</button>
      <button class="btn-danger" id="confirmToggle">Confirmar</button>
    </div>
  `);

  document.getElementById("cancelToggle").onclick = fecharModal;

  document.getElementById("confirmToggle").onclick = async () => {
    const btn = document.getElementById("confirmToggle");
    btn.disabled = true;
    btn.textContent = "Processando...";

    try {
      await apiPut(`/empresas/${empresaId}/status`, { ativo: !ativoAtual });

      fecharModal();
      carregarEmpresas();

      const msg = ativoAtual
        ? "Empresa inativada com sucesso"
        : "Empresa ativada com sucesso";

      showMessage(msg, "Sucesso");

    } catch {
      btn.disabled = false;
      btn.textContent = "Confirmar";
      showMessage("Erro ao alterar status da empresa", "Erro");
    }
  };
};

/* =========================
   NOVA EMPRESA
========================= */
btnNovaEmpresa.onclick = () => {
  abrirModal(`
    <h3>Nova empresa</h3>

    <input id="empresaNome" placeholder="Nome da empresa"/>

    <div class="modal-actions">
      <button class="btn-secondary" id="cancelEmpresa">Cancelar</button>
      <button class="btn-primary" id="saveEmpresa">Salvar</button>
    </div>
  `);

  document.getElementById("cancelEmpresa").onclick = fecharModal;
  document.getElementById("saveEmpresa").onclick = salvarEmpresa;
};

async function salvarEmpresa() {
  const input = document.getElementById("empresaNome");
  const btn = document.getElementById("saveEmpresa");

  const nome = input.value.trim();
  if (!nome) {
    showMessage("Informe o nome da empresa", "Aviso");
    return;
  }

  btn.disabled = true;
  btn.textContent = "Salvando...";

  try {
    await apiPost("/empresas", { nome });

    fecharModal();
    carregarEmpresas();
    showMessage("Empresa criada com sucesso", "Sucesso");

  } catch {
    btn.disabled = false;
    btn.textContent = "Salvar";
    showMessage("Erro ao criar empresa", "Erro");
  }
}

/* =========================
   ADMINS POR EMPRESA
========================= */
window.abrirModalAdmins = async (empresaId, empresaNome) => {
  abrirModal(`
    <h3>Administradores</h3>
    <p class="text-muted">${escapeHtml(empresaNome)}</p>

    <div id="adminsList" style="margin-top:12px">
      Carregando...
    </div>

    <div class="modal-actions">
      <button class="btn-secondary" id="btnFecharAdmins">Fechar</button>
      <button class="btn-primary" id="btnNovoAdmin">Novo admin</button>
    </div>
  `);

  // ✅ Fechar funcionando (não usa onclick inline)
  document.getElementById("btnFecharAdmins").onclick = fecharModal;

  document.getElementById("btnNovoAdmin").onclick = () =>
    abrirModalCriarAdmin(empresaId, empresaNome);

  await carregarAdminsEmpresa(empresaId, empresaNome);
};

async function carregarAdminsEmpresa(empresaId, empresaNome) {
  const container = document.getElementById("adminsList");
  if (!container) return;

  try {
    const admins = await apiGet(`/empresas/${empresaId}/admins`);

    if (!admins.length) {
      container.innerHTML =
        `<p class="text-muted">Nenhum administrador cadastrado</p>`;
      return;
    }

   container.innerHTML = `
  <div class="admin-list">
    ${admins.map(a => `
      <div class="admin-item">
        <div class="admin-info">
          <strong>${escapeHtml(a.nome)}</strong>
          <span>${escapeHtml(a.email)}</span>
          <span class="admin-status ${a.ativo ? "ativo" : "inativo"}">
            ${a.ativo ? "Ativo" : "Inativo"}
          </span>
        </div>

        <div class="admin-actions">
          <button class="btn-edit"
            onclick="abrirModalEditarAdmin(${empresaId}, '${String(empresaNome).replace(/'/g, "\\'")}', ${a.id}, '${String(a.nome).replace(/'/g, "\\'")}', '${String(a.email).replace(/'/g, "\\'")}', ${a.ativo})">
            Editar
          </button>

          <button class="${a.ativo ? "btn-danger" : "btn-activate"}"
            onclick="toggleAdmin(${empresaId}, '${String(empresaNome).replace(/'/g, "\\'")}', ${a.id}, ${a.ativo})">
            ${a.ativo ? "Inativar" : "Ativar"}
          </button>
        </div>
      </div>
    `).join("")}
  </div>
`;


  } catch {
    container.innerHTML =
      `<p class="text-muted">Erro ao carregar administradores</p>`;
  }
}

/* =========================
   CRIAR ADMIN
========================= */
function abrirModalCriarAdmin(empresaId, empresaNome) {
  abrirModal(`
    <h3>Novo administrador</h3>
    <p class="text-muted">${escapeHtml(empresaNome)}</p>

    <input id="adminNome" placeholder="Nome"/>
    <input id="adminEmail" type="email" placeholder="E-mail"/>
    <input id="adminSenha" type="password" placeholder="Senha"/>

    <div class="modal-actions">
      <button class="btn-secondary" id="cancelAdmin">Cancelar</button>
      <button class="btn-primary" id="saveAdmin">Criar</button>
    </div>
  `);

  // ✅ Cancelar funcionando
  document.getElementById("cancelAdmin").onclick = () =>
    window.abrirModalAdmins(empresaId, empresaNome);

  document.getElementById("saveAdmin").onclick = () =>
    salvarAdmin(empresaId, empresaNome);
}

async function salvarAdmin(empresaId, empresaNome) {
  const nome = document.getElementById("adminNome").value.trim();
  const email = document.getElementById("adminEmail").value.trim();
  const senha = document.getElementById("adminSenha").value.trim();
  const btn = document.getElementById("saveAdmin");

  if (!nome || !email || !senha) {
    showMessage("Preencha todos os campos", "Aviso");
    return;
  }

  btn.disabled = true;
  btn.textContent = "Criando...";

  try {
    await apiPost(`/empresas/${empresaId}/admin`, { nome, email, senha });

    showMessage("Administrador criado com sucesso", "Sucesso");
    // volta para lista de admins
    await window.abrirModalAdmins(empresaId, empresaNome);

  } catch {
    btn.disabled = false;
    btn.textContent = "Criar";
    showMessage("Erro ao criar administrador", "Erro");
  }
}

/* =========================
   EDITAR ADMIN
========================= */
window.abrirModalEditarAdmin = (empresaId, empresaNome, adminId, nome, email, ativo) => {
  abrirModal(`
    <h3>Editar administrador</h3>
    <p class="text-muted">${escapeHtml(empresaNome)}</p>

    <input id="editAdminNome" placeholder="Nome" value="${escapeHtml(nome)}"/>
    <input id="editAdminEmail" type="email" placeholder="E-mail" value="${escapeHtml(email)}"/>
    <input id="editAdminSenha" type="password" placeholder="Nova senha (opcional)"/>

    <div class="modal-actions">
      <button class="btn-secondary" id="cancelEditAdmin">Cancelar</button>
      <button class="btn-primary" id="saveEditAdmin">Salvar</button>
    </div>
  `);

  document.getElementById("cancelEditAdmin").onclick = () =>
    window.abrirModalAdmins(empresaId, empresaNome);

  document.getElementById("saveEditAdmin").onclick = async () => {
    const btn = document.getElementById("saveEditAdmin");
    const novoNome = document.getElementById("editAdminNome").value.trim();
    const novoEmail = document.getElementById("editAdminEmail").value.trim();
    const novaSenha = document.getElementById("editAdminSenha").value.trim();

    if (!novoNome || !novoEmail) {
      showMessage("Nome e e-mail são obrigatórios", "Aviso");
      return;
    }

    btn.disabled = true;
    btn.textContent = "Salvando...";

    try {
      const payload = { nome: novoNome, email: novoEmail };
      if (novaSenha) payload.senha = novaSenha;

      // ✅ Backend necessário:
      // PUT /usuarios/{id}  body: {nome,email,senha?}
      await apiPut(`/usuarios/${adminId}`, payload);

      showMessage("Administrador atualizado com sucesso", "Sucesso");
      await window.abrirModalAdmins(empresaId, empresaNome);

    } catch {
      btn.disabled = false;
      btn.textContent = "Salvar";
      showMessage("Erro ao atualizar administrador", "Erro");
    }
  };
};

/* =========================
   ATIVAR / INATIVAR ADMIN
========================= */
window.toggleAdmin = (empresaId, empresaNome, adminId, ativoAtual) => {
  const acao = ativoAtual ? "inativar" : "ativar";

  abrirModal(`
    <h3>Confirmar ação</h3>
    <p>Deseja ${acao} este administrador?</p>

    <div class="modal-actions">
      <button class="btn-secondary" id="cancelToggleAdmin">Cancelar</button>
      <button class="btn-danger" id="confirmToggleAdmin">Confirmar</button>
    </div>
  `);

  document.getElementById("cancelToggleAdmin").onclick = () =>
    window.abrirModalAdmins(empresaId, empresaNome);

  document.getElementById("confirmToggleAdmin").onclick = async () => {
    const btn = document.getElementById("confirmToggleAdmin");
    btn.disabled = true;
    btn.textContent = "Processando...";

    try {
      // ✅ Backend necessário:
      // PUT /usuarios/{id}/status  body: {ativo:true/false}
      await apiPut(`/usuarios/${adminId}/status`, { ativo: !ativoAtual });

      const msg = ativoAtual
        ? "Administrador inativado com sucesso"
        : "Administrador ativado com sucesso";

      showMessage(msg, "Sucesso");
      await window.abrirModalAdmins(empresaId, empresaNome);

    } catch {
      btn.disabled = false;
      btn.textContent = "Confirmar";
      showMessage("Erro ao alterar status do administrador", "Erro");
    }
  };
};
