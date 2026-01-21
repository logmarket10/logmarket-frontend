import { requireAuth } from "./guard.js";
import { renderLayout } from "./layout.js";
import { apiGet, redirectMercadoLivreAuth } from "./api.js";

requireAuth();
renderLayout("integracoes");

const page = document.getElementById("pageContent");

/**
 * Configurações de cache
 */
const CACHE_KEY = "ml_status_cache";
const CACHE_TTL_MS = 30 * 1000; // 30 segundos

page.innerHTML = `
  <section class="pagebar">
    <div class="pagebar-title">Integrações</div>
  </section>

  <div class="card" style="padding:22px; border-radius:16px;">
    <div style="display:flex; align-items:center; justify-content:space-between; gap:16px; flex-wrap:wrap;">
      <div>
        <h3 style="font-size:18px; margin-bottom:6px;">Mercado Livre</h3>

        <p id="mlStatusText" style="color:#6b7280; font-size:14px;">
          <span class="spinner"></span>
          Verificando conexão com o Mercado Livre...
        </p>
      </div>

      <div style="display:flex; gap:10px; align-items:center;">
        <button id="btnConnectML" class="btn btn-primary">Conectar</button>
        <button id="btnDisconnectML" class="btn btn-muted" style="display:none;">Desconectar</button>
      </div>
    </div>
  </div>
`;

const mlStatusText = document.getElementById("mlStatusText");
const btnConnectML = document.getElementById("btnConnectML");
const btnDisconnectML = document.getElementById("btnDisconnectML");

/**
 * Renderiza status na tela
 */
function renderStatus(s) {
  if (s?.connected) {
    mlStatusText.textContent = `Conectado como ${s.nickname || "usuário"}`;
    btnConnectML.textContent = "Reconectar";
    btnDisconnectML.style.display = "inline-flex";
  } else {
    mlStatusText.textContent = "Não conectado.";
    btnConnectML.textContent = "Conectar";
    btnDisconnectML.style.display = "none";
  }
}

/**
 * Lê cache local
 */
function getCachedStatus() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.ts > CACHE_TTL_MS) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }

    return parsed.data;
  } catch {
    return null;
  }
}

/**
 * Salva cache local
 */
function setCachedStatus(data) {
  localStorage.setItem(
    CACHE_KEY,
    JSON.stringify({
      ts: Date.now(),
      data
    })
  );
}

/**
 * Busca status no backend (com cache)
 */
async function carregarStatus() {
  // 1️⃣ tenta cache
  const cached = getCachedStatus();
  if (cached) {
    renderStatus(cached);

    // 2️⃣ atualiza em background
    atualizarStatusBackground();
    return;
  }

  // 3️⃣ sem cache → spinner visível
  try {
    const s = await apiGet("/integracoes/mercadolivre/status");
    renderStatus(s);
    setCachedStatus(s);
  } catch {
    mlStatusText.textContent =
      "Falha ao carregar status. Verifique sua sessão.";
  }
}

/**
 * Atualização silenciosa
 */
async function atualizarStatusBackground() {
  try {
    const s = await apiGet("/integracoes/mercadolivre/status");
    setCachedStatus(s);
    renderStatus(s);
  } catch {
    // silencioso
  }
}

/**
 * Eventos
 */
btnConnectML.onclick = () => {
  redirectMercadoLivreAuth();
};

/**
 * Desconectar Mercado Livre (REAL)
 */
async function desconectarMercadoLivre() {
  const ok = confirm(
    "Ao desconectar, você precisará autorizar novamente o Mercado Livre.\n\nDeseja continuar?"
  );

  if (!ok) return;

  try {
    btnDisconnectML.disabled = true;
    btnDisconnectML.textContent = "Desconectando...";

    await apiGet("/integracoes/mercadolivre/disconnect", {
      method: "POST"
    });

    // limpa cache local
    localStorage.removeItem(CACHE_KEY);

    // atualiza UI imediatamente
    renderStatus({ connected: false });

    alert("Mercado Livre desconectado com sucesso.");

  } catch (e) {
    alert("Falha ao desconectar Mercado Livre.");
    console.error(e);
  } finally {
    btnDisconnectML.disabled = false;
    btnDisconnectML.textContent = "Desconectar";
  }
}


// 🚀 start
carregarStatus();

