export function renderLayout(active) {
  const root = document.getElementById("appRoot");

  const me = JSON.parse(localStorage.getItem("user"));

  const isAdmin = me && (me.perfil === "admin" || me.perfil === "super_admin");
  const isSuperAdmin = me && me.perfil === "super_admin";


  root.innerHTML = `
    <!-- HEADER -->
    <header class="app-header">
      <div class="header-left">
        <img src="assets/logo.png" alt="LogMarket">
        <span>LogMarket</span>
      </div>

      <div class="user-info">
        <div class="user-text">
          <span class="user-name">${me?.nome || ""}</span>
          <span class="user-profile">
              ${
                me?.perfil === "super_admin"
                  ? "Super Administrador"
                  : me?.perfil === "admin"
                  ? "Administrador"
                  : "Usuário"
              }
            </span>
        </div>

        <button class="logout-btn" id="logoutBtn">Sair</button>
      </div>
    </header>

    <!-- LAYOUT -->
    <div class="layout">

      <!-- SIDEBAR -->
      <aside class="sidebar">

          ${
            isSuperAdmin
              ? `
                <a href="dashboard_sistema.html" class="${active === "dashboard_sistema" ? "active" : ""}">
                  Painel do Sistema
                </a>

                <a href="empresas.html" class="${active === "empresas" ? "active" : ""}">
                  Empresas
                </a>

                <a href="usuarios.html" class="${active === "usuarios" ? "active" : ""}">
                  Usuários
                </a>
              `
              : `
                <a href="dashboard.html" class="${active === "dashboard" ? "active" : ""}">
                  Dashboard
                </a>

                <a href="skus.html" class="${active === "skus" ? "active" : ""}">
                  SKUs
                </a>

                <a href="anuncios.html" class="${active === "anuncios" ? "active" : ""}">
                  Anúncios
                </a>

                <a href="reposicao.html" class="${active === "reposicao" ? "active" : ""}">
                  Reposição
                </a>

                <a href="ruptura.html" class="${active === "ruptura" ? "active" : ""}">
                  Rupturas
                </a>

                <a href="integracoes.html" class="${active === "integracoes" ? "active" : ""}">
                  Integrações
                </a>

                ${
                  isAdmin
                    ? `
                      <a href="usuarios.html" class="${active === "usuarios" ? "active" : ""}">
                        Usuários
                      </a>
                    `
                    : ""
                }
              `
          }

        </aside>


      <!-- CONTEÚDO -->
      <main class="content">
        <div id="pageContent"></div>
      </main>
    </div>

    <!-- FOOTER -->
    <footer>
      LogMarket © 2026 • Plataforma de controle de anúncios
    </footer>
  `;

  /* ===============================
     LOGOUT COM CONFIRMAÇÃO
  =============================== */
  const logoutBtn = document.getElementById("logoutBtn");

  if (!logoutBtn) return;

  logoutBtn.onclick = () => {
    const overlay = document.createElement("div");
    overlay.className = "toast-overlay";

    overlay.innerHTML = `
      <div class="toast">
        <h3>Sair do sistema</h3>
        <p>Deseja realmente sair?</p>

        <div class="toast-actions">
          <button class="btn btn-muted" id="logoutCancel">Cancelar</button>
          <button class="btn btn-danger" id="logoutConfirm">Sair</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const btnCancel = overlay.querySelector("#logoutCancel");
    const btnConfirm = overlay.querySelector("#logoutConfirm");

    const close = () => {
      document.removeEventListener("keydown", handleKeys);
      overlay.remove();
    };

    const confirm = () => {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "login.html";
    };

    const handleKeys = (e) => {
      if (e.key === "Escape") close();
      if (e.key === "Enter") confirm();
    };

    btnCancel.onclick = close;
    btnConfirm.onclick = confirm;

    overlay.onclick = (e) => {
      if (e.target === overlay) close();
    };

    document.addEventListener("keydown", handleKeys);

    // UX: foco inicial
    btnCancel.focus();
  };
}
