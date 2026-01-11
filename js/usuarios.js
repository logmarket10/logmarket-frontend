import { renderLayout } from "./layout.js";
import { apiGet, apiPost, apiFetch } from "./api.js";
import { requireAuth } from "./guard.js";

requireAuth();
renderLayout("usuarios");

/* =========================
   USUÁRIO LOGADO
========================= */
const me = JSON.parse(localStorage.getItem("user"));

if (!me || me.perfil !== "admin") {
  alert("Acesso restrito a administradores.");
  window.location.href = "dashboard.html";
}

/* =========================
   PAGE CONTENT
========================= */
const page = document.getElementById("pageContent");

page.innerHTML = `
  <!-- PAGEBAR -->
  <section class="pagebar usuarios-pagebar">
    <div class="pagebar-title">Usuários</div>
  </section>

  <!-- FORM CARD -->
  <section class="usuarios-form-bar">
    <div class="form-card">
      <h3>Novo usuário</h3>

      <form id="userForm" class="form-grid form-grid-usuarios">
        <input
          class="ui-input"
          name="nome"
          placeholder="Nome completo"
          required
        />

        <input
          class="ui-input"
          name="email"
          type="email"
          placeholder="E-mail"
          required
        />

        <input
          class="ui-input"
          name="senha"
          type="password"
          placeholder="Senha provisória"
          required
        />

        <select class="ui-input" name="perfil" required>
          <option value="">Perfil de acesso</option>
          <option value="usuario">Usuário</option>
          <option value="admin">Administrador</option>
        </select>

        <button class="btn btn-primary" type="submit">
          Cadastrar usuário
        </button>
      </form>

      <p class="form-hint">
        O usuário será vinculado automaticamente à empresa do administrador logado.
      </p>
    </div>
  </section>

  <!-- TABELA -->
  <div class="table-wrap usuarios-table-wrap">
    <table id="usersTable">
      <thead>
        <tr>
          <th>Nome</th>
          <th>Email</th>
          <th>Perfil</th>
          <th>Status</th>
          <th>Ações</th>
        </tr>
      </thead>
      <tbody></tbody>
    </table>
  </div>

  <!-- MODAL EDITAR -->
  <div id="editModal" class="toast-overlay hidden">
    <div class="toast">
      <h3>Editar usuário</h3>

      <input id="editNome" class="ui-input" placeholder="Nome completo" />
      <input id="editEmail" class="ui-input" placeholder="E-mail" />

      <select id="editPerfil" class="ui-input">
        <option value="usuario">Usuário</option>
        <option value="admin">Administrador</option>
      </select>

      <div class="toast-actions">
        <button id="editCancel" class="btn btn-muted">Cancelar</button>
        <button id="editSave" class="btn btn-primary">Salvar</button>
      </div>
    </div>
  </div>
`;

/* =========================
   TOAST
========================= */
function showToast(title, message) {
  const overlay = document.createElement("div");
  overlay.className = "toast-overlay";

  overlay.innerHTML = `
    <div class="toast">
      <h3>${title}</h3>
      <p>${message}</p>
      <button class="btn btn-primary">OK</button>
    </div>
  `;

  overlay.querySelector("button").onclick = () => overlay.remove();
  document.body.appendChild(overlay);
}

/* =========================
   EDIT MODAL
========================= */
const editModal = document.getElementById("editModal");
const editNome = document.getElementById("editNome");
const editEmail = document.getElementById("editEmail");
const editPerfil = document.getElementById("editPerfil");
const editCancel = document.getElementById("editCancel");
const editSave = document.getElementById("editSave");

let usuarioEditando = null;

editCancel.onclick = () => {
  editModal.classList.add("hidden");
  usuarioEditando = null;
};

/* =========================
   LOAD USUÁRIOS
========================= */
async function carregarUsuarios() {
  const tbody = document.querySelector("#usersTable tbody");
  tbody.innerHTML = `<tr><td colspan="5">Carregando...</td></tr>`;

  try {
    const users = await apiGet("/usuarios");
    tbody.innerHTML = "";

    users.forEach(u => {
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${u.nome}</td>
        <td>${u.email}</td>
        <td>${u.perfil}</td>
        <td>
          <span class="badge ${u.ativo ? "ativo" : "inativo"}">
            ${u.ativo ? "Ativo" : "Inativo"}
          </span>
        </td>
        <td></td>
      `;

      const actions = tr.lastElementChild;

      if (u.id === me.id) {
        actions.innerHTML = `<em>Usuário atual</em>`;
      } else {
        const btnEdit = document.createElement("button");
        btnEdit.className = "btn btn-warning";
        btnEdit.textContent = "Editar";

        const btnToggle = document.createElement("button");
        btnToggle.className = u.ativo ? "btn btn-danger" : "btn btn-primary";
        btnToggle.textContent = u.ativo ? "Desativar" : "Ativar";

        btnEdit.onclick = () => {
          usuarioEditando = u;
          editNome.value = u.nome;
          editEmail.value = u.email;
          editPerfil.value = u.perfil;
          editModal.classList.remove("hidden");
        };

        btnToggle.onclick = async () => {
          await apiFetch(`/usuarios/${u.id}`, {
            method: "PUT",
            body: JSON.stringify({ ...u, ativo: !u.ativo })
          });
          carregarUsuarios();
        };

        actions.append(btnEdit, btnToggle);
      }

      tbody.appendChild(tr);
    });
  } catch {
    showToast("Erro", "Falha ao carregar usuários.");
  }
}

/* =========================
   SALVAR EDIÇÃO
========================= */
editSave.onclick = async () => {
  if (!usuarioEditando) return;

  try {
    await apiFetch(`/usuarios/${usuarioEditando.id}`, {
      method: "PUT",
      body: JSON.stringify({
        nome: editNome.value,
        email: editEmail.value,
        perfil: editPerfil.value,
        ativo: usuarioEditando.ativo
      })
    });

    editModal.classList.add("hidden");
    showToast("Sucesso", "Usuário atualizado.");
    carregarUsuarios();
  } catch {
    showToast("Erro", "Falha ao atualizar usuário.");
  }
};

/* =========================
   CADASTRO
========================= */
document.getElementById("userForm").onsubmit = async e => {
  e.preventDefault();

  const f = new FormData(e.target);

  try {
    await apiPost("/usuarios", {
      nome: f.get("nome"),
      email: f.get("email"),
      senha: f.get("senha"),
      perfil: f.get("perfil")
    });

    showToast("Sucesso", "Usuário cadastrado.");
    e.target.reset();
    carregarUsuarios();
  } catch {
    showToast("Erro", "Erro ao cadastrar usuário.");
  }
};

/* INIT */
carregarUsuarios();
