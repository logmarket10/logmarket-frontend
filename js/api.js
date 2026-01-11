const API_URL = "https://logmarket.azurewebsites.net";

/**
 * Função genérica para chamadas à API
 */
export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("token");

  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };

  // Só define Content-Type se NÃO for FormData
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  // Permite sobrescrever headers manualmente
  if (options.headers) {
    Object.assign(headers, options.headers);
  }

  const response = await fetch(API_URL + path, {
    ...options,
    headers
  });

  // Sem conteúdo
  if (response.status === 204) return null;

  let data = null;

  try {
    data = await response.json();
  } catch {
    // resposta não é JSON
  }

  if (!response.ok) {
    // padrão FastAPI: { detail: "mensagem" }
    if (data && data.detail) {
      throw new Error(data.detail);
    }

    throw new Error("Erro inesperado na API");
  }

  return data;
}

/**
 * GET
 */
export function apiGet(path) {
  return apiFetch(path, { method: "GET" });
}

/**
 * POST JSON
 */
export function apiPost(path, body) {
  return apiFetch(path, {
    method: "POST",
    body: JSON.stringify(body)
  });
}

/**
 * PUT JSON
 */
export function apiPut(path, body = {}) {
  return apiFetch(path, {
    method: "PUT",
    body: JSON.stringify(body)
  });
}

/**
 * DELETE
 */
export function apiDelete(path) {
  return apiFetch(path, {
    method: "DELETE"
  });
}

/**
 * OAuth Mercado Livre (fluxo correto)
 */
export async function redirectMercadoLivreAuth() {
  const { url } = await apiGet("/integracoes/mercadolivre/auth");
  window.location.href = url;
}
