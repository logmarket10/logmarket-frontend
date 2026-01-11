const form = document.getElementById("loginForm");

// Modal
const modal = document.getElementById("modalOverlay");
const modalTitle = document.getElementById("modalTitle");
const modalMessage = document.getElementById("modalMessage");
const modalClose = document.getElementById("modalClose");

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

  const email = document.getElementById("email").value;
  const senha = document.getElementById("senha").value;

  try {
    const resp = await fetch(
      "https://logmarket.azurewebsites.net/auth/login",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha }),
      }
    );

    const data = await resp.json();

    if (!resp.ok) {
      abrirModal("Erro ao entrar", data.detail || "Credenciais inválidas");
      return;
    }

    /* =========================
       LOGIN OK
    ========================= */

    // Token JWT
    localStorage.setItem("token", data.access_token);

    // Usuário completo (inclui perfil)
    localStorage.setItem("user", JSON.stringify(data.user));

    if (data.user.perfil === "super_admin") {
  window.location.href = "dashboard_sistema.html";
        } else {
          window.location.href = "dashboard.html";
        }


  } catch (err) {
    abrirModal(
      "Erro de conexão",
      "Não foi possível conectar ao servidor. Tente novamente."
    );
  }
});

/* =========================
   RECUPERAÇÃO DE SENHA
========================= */
const forgotLink = document.querySelector(".forgot");
const forgotOverlay = document.getElementById("forgotOverlay");
const sendRecovery = document.getElementById("sendRecovery");

if (forgotLink && forgotOverlay) {
  forgotLink.addEventListener("click", (e) => {
    e.preventDefault();
    forgotOverlay.classList.remove("hidden");
  });
}

if (sendRecovery) {
  sendRecovery.addEventListener("click", async () => {
    const email = document.getElementById("forgotEmail").value;

    if (!email) {
      abrirModal("Atenção", "Informe seu e-mail.");
      return;
    }

    // Backend futuro
    abrirModal(
      "Solicitação enviada",
      "Se o e-mail existir, você receberá instruções para redefinir a senha."
    );

    forgotOverlay.classList.add("hidden");
  });
}

/* =========================
   MOSTRAR / OCULTAR SENHA
========================= */
const togglePassword = document.querySelector(".toggle-password");
const senhaInput = document.getElementById("senha");

if (togglePassword && senhaInput) {
  togglePassword.addEventListener("click", () => {
    const isPassword = senhaInput.type === "password";
    senhaInput.type = isPassword ? "text" : "password";
    togglePassword.textContent = isPassword ? "🙈" : "👁";
  });
}

/* =========================
   LOADING NO BOTÃO
========================= */
const btnLogin = document.getElementById("btnLogin");

form.addEventListener("submit", () => {
  btnLogin.classList.add("loading");
  btnLogin.textContent = "Entrando...";
});
