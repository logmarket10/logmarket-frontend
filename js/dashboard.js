import { renderLayout } from "./layout.js";
import { apiGet } from "./api.js";
import { requireAuth } from "./guard.js";

requireAuth();
renderLayout("dashboard");

const page = document.getElementById("pageContent");

/* =========================
   LOAD DATA
========================= */
async function carregarDashboard() {
  const anuncios = await apiGet("/ml/anuncios");

  /* -------------------------
     CONTADORES BÁSICOS
  -------------------------- */
  const totalAnuncios = anuncios.length;

  const vinculados = anuncios.filter(a => a.sku).length;
  const semVinculo = anuncios.filter(a => !a.sku).length;

  const ativos = anuncios.filter(a => a.status === "ativo").length;
  const pausados = anuncios.filter(a => a.status === "pausado").length;

  /* -------------------------
     RUPTURAS
     Regra:
     - estoque_ml === 0
     - OU estoque_ml <= estoque_minimo do SKU
  -------------------------- */
  let rupturasAtivas = 0;

  anuncios.forEach(a => {
    if (!a.sku) return;

    const estoque = Number(a.estoque_ml);
    const minimo = Number(a.sku.estoque_minimo);

    if (estoque === 0 || estoque <= minimo) {
      rupturasAtivas++;
    }
  });

  renderDashboard({
    totalAnuncios,
    vinculados,
    semVinculo,
    ativos,
    pausados,
    rupturasAtivas
  });
}

/* =========================
   RENDER
========================= */
function renderDashboard(d) {
  page.innerHTML = `


    <div class="kpi-grid">

      <div class="kpi-card">
        <span class="kpi-title">Total de anúncios</span>
        <strong>${d.totalAnuncios}</strong>
      </div>

      <div class="kpi-card">
        <span class="kpi-title">Anúncios vinculados</span>
        <strong>${d.vinculados}</strong>
      </div>

      <div class="kpi-card">
        <span class="kpi-title">Anúncios sem vínculo</span>
        <strong>${d.semVinculo}</strong>
      </div>

      <div class="kpi-card">
        <span class="kpi-title">Anúncios ativos</span>
        <strong>${d.ativos}</strong>
      </div>

      <div class="kpi-card">
        <span class="kpi-title">Anúncios pausados</span>
        <strong>${d.pausados}</strong>
      </div>

      <div class="kpi-card ${d.rupturasAtivas > 0 ? "danger" : ""}">
        <span class="kpi-title">Rupturas ativas</span>
        <strong>${d.rupturasAtivas}</strong>
      </div>

    </div>

    ${
      d.rupturasAtivas > 0
        ? `
          <div class="alert">
            Existem produtos com ruptura ativa.
            <a href="ruptura.html">Ver agora</a>
          </div>
        `
        : ""
    }
  `;
}

/* =========================
   BOOT
========================= */
await carregarDashboard();
