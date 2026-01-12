import { apiPost } from "./api.js";

const form = document.getElementById("loginForm");

// Modal
const modal = document.getElementById("modalOverlay");
const modalTitle = document.getElementById("modalTitle");
const modalMessage = document.getElementById("modalMessage");
const modalClose = document.getElementById("modalClose");

const btnLogin = document.getElementById("btnLogin");

function abrirModal(titulo, mensagem) {
  modalTitle.textContent = titulo;
  modalMessage.textContent = mensagem;
  modal.classList.remove("hidden");
}

modalClose.addEventListener("click", () => {
  modal.classList.add("hidden");
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  btnLogin.classList.add("loading");
  btnLogin.textContent = "Entrando...";

  const email = document.getElementById("email").value;
  const senha = document.getElementById("senha").value;

  try {
    const data = await apiPost("/auth/login", { email, senha });

    // Token JWT
    localStorage.setItem("token", data.access_token);

    // Usuário
    localStorage.setItem("user", JSON.stringify(data.user));

    // Redirecionamento por perfil
    if (data.user.perfil === "super_admin") {
      window.location.href = "dashboard_sistema.html";
    } else {
      window.location.href = "dashboard.html";
    }

  } catch (err) {
    abrirModal(
      "Erro de login",
      err.message || "Não foi possível autenticar. Verifique seus dados."
    );
  } finally {
    btnLogin.classList.remove("loading");
    btnLogin.textContent = "Entrar";
  }
});
