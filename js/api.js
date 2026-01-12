const API_URL = "https://logmarket.azurewebsites.net";

export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem("token"); // ✅ CORRIGIDO

  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  if (options.headers) {
    Object.assign(headers, options.headers);
  }

  const response = await fetch(API_URL + path, {
    ...options,
    headers
  });

  if (response.status === 401) {
    localStorage.removeItem("token"); // ✅ CORRIGIDO
    localStorage.removeItem("user");
    window.location.href = "login.html"; // relativo ao site
    return;
  }

  if (response.status === 204) return null;

  let data = null;
  try {
    data = await response.json();
  } catch {}

  if (!response.ok) {
    if (data && data.detail) {
      throw new Error(data.detail);
    }
    throw new Error("Erro inesperado na API");
  }

  return data;
}


export const apiGet = (path) => apiFetch(path, { method: "GET" });
export const apiPost = (path, body) =>
  apiFetch(path, { method: "POST", body: JSON.stringify(body) });
export const apiPut = (path, body = {}) =>
  apiFetch(path, { method: "PUT", body: JSON.stringify(body) });
export const apiDelete = (path) =>
  apiFetch(path, { method: "DELETE" });

export async function redirectMercadoLivreAuth() {
  const { url } = await apiGet("/integracoes/mercadolivre/auth");
  window.location.href = url;
}

