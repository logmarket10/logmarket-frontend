export function requireAuth() {
  const token = localStorage.getItem("token");
  const userRaw = localStorage.getItem("user");

  if (!token || !userRaw) {
    window.location.href = "login.html";
    return;
  }
}

export function requireSuperAdmin() {
  requireAuth();

  const user = JSON.parse(localStorage.getItem("user"));
  if (!user || user.perfil !== "super_admin") {
    window.location.href = "dashboard.html";
  }
}
