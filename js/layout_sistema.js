export function renderLayoutSistema() {
  const root = document.getElementById("appRoot");
  const me = JSON.parse(localStorage.getItem("user"));

  root.innerHTML = `
    <header class="app-header">
      <div class="header-left">
        <strong>LogMarket • Sistema</strong>
      </div>

      <div class="user-info">
        <span>${me.nome}</span>
        <button id="logoutBtn">Sair</button>
      </div>
    </header>

    <main class="content">
      <h1>Empresas</h1>
      <button class="btn-primary" id="btnNovaEmpresa">Nova empresa</button>

      <div id="empresasList" style="margin-top:24px;"></div>
    </main>
  `;

  document.getElementById("logoutBtn").onclick = () => {
    localStorage.clear();
    window.location.href = "login.html";
  };
}
