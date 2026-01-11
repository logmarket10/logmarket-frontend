/* ======================================================
   UI GLOBAL — LOGMARKET
====================================================== */

const overlay = document.getElementById("modalOverlay");

export function showMessage(msg, ttl = "Aviso") {
  if (!overlay) {
    alert(msg);
    return;
  }

  overlay.innerHTML = `
    <div class="modal-card">
      <h3>${ttl}</h3>
      <p>${msg}</p>
      <div class="modal-actions">
        <button class="btn-primary" id="modalOk">OK</button>
      </div>
    </div>
  `;

  overlay.classList.remove("hidden");

  document.getElementById("modalOk").onclick = fecharModal;
}

export function abrirModal(html) {
  if (!overlay) return;

  overlay.innerHTML = `<div class="modal-card">${html}</div>`;
  overlay.classList.remove("hidden");
}

export function fecharModal() {
  if (!overlay) return;
  overlay.classList.add("hidden");
  overlay.innerHTML = "";
}

/* ===============================
   BOOT
=============================== */
document.addEventListener("DOMContentLoaded", () => {
  // reservado para efeitos globais
});
