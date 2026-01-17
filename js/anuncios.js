import { renderLayout } from "./layout.js";
import { apiGet, apiPost } from "./api.js";
import { requireAuth } from "./guard.js";

requireAuth();
renderLayout("anuncios");

const page = document.getElementById("pageContent");

if (!page) {
  throw new Error("pageContent não encontrado. Verifique o layout.");
}

const tbody = document.getElementById("tbody");
const busca = document.getElementById("busca");
const totalSpan = document.getElementById("total");
const ultimaAtualizacao = document.getElementById("ultimaAtualizacao");
const btnSync = document.getElementById("btnSync");

const overlay = document.getElementById("overlay");
const overlayMsg = document.getElementById("overlayMsg");

let anuncios = [];

function showOverlay(msg) {
  overlayMsg.textContent = msg;
  overlay.classList.remove("hidden");
}

function hideOverlay() {
  overlay.classList.add("hidden");
}

async function carregarAnuncios() {
  const data = await apiGet("/ml/anuncios");
  anuncios = data;
  render();
}

function render() {
  const q = busca.value.toLowerCase();

  const filtrados = anuncios.filter(a =>
    a.ml_item_id.toLowerCase().includes(q) ||
    a.titulo.toLowerCase().includes(q) ||
    (a.seller_sku || "").toLowerCase().includes(q)
  );

  tbody.innerHTML = "";

  for (const a of filtrados) {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${a.ml_item_id}</td>
      <td>${a.titulo}</td>
      <td>${a.tipo_anuncio}</td>
      <td>${a.is_full ? "FULL" : "Mercado Envios"}</td>
      <td>${a.status}</td>
      <td>${a.estoque_ml}</td>
      <td>${a.sku ? a.sku.sku_codigo : "—"}</td>
      <td>
        ${
          a.acao === "VINCULAR"
            ? `<button class="link" data-id="${a.ml_item_id}">Vincular</button>`
            : `<button class="unlink" data-id="${a.ml_item_id}">Desvincular</button>`
        }
      </td>
    `;

    tbody.appendChild(tr);
  }

  totalSpan.textContent = filtrados.length;
}

async function sincronizar() {
  btnSync.disabled = true;
  btnSync.textContent = "Atualizando...";

  showOverlay("Sincronizando anúncios...");

  const r = await apiPost("/ml/sincronizar-anuncios", {});
  const jobId = r.job_id;

  const timer = setInterval(async () => {
    const job = await apiGet(`/jobs/${jobId}`);

    if (job.status === "SUCESSO") {
      clearInterval(timer);
      hideOverlay();
      btnSync.disabled = false;
      btnSync.textContent = "Atualizar anúncios";

      ultimaAtualizacao.textContent =
        "Última atualização: " +
        new Date(job.finalizado_em).toLocaleString("pt-BR");

      await carregarAnuncios();
    }

    if (job.status === "ERRO") {
      clearInterval(timer);
      hideOverlay();
      alert("Erro ao sincronizar anúncios");
      btnSync.disabled = false;
      btnSync.textContent = "Atualizar anúncios";
    }
  }, 2000);
}

tbody.addEventListener("click", async (e) => {
  const btn = e.target;
  const mlItemId = btn.dataset.id;
  if (!mlItemId) return;

  if (btn.classList.contains("unlink")) {
    if (!confirm("Deseja realmente desvincular este anúncio?")) return;

    await apiPost("/anuncios/desvincular", { ml_item_id: mlItemId });
    await carregarAnuncios();
  }

  if (btn.classList.contains("link")) {
    alert("Vínculo automático ocorre ao cadastrar SKU.\nUse a tela de SKUs.");
  }
});

busca.addEventListener("input", render);
btnSync.addEventListener("click", sincronizar);

carregarAnuncios();

