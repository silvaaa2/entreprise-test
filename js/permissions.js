import { getCurrentUserRole } from "./user.js";

const permissionsMap = {
  admin: [
    "manage_users",
    "manage_employees",
    "manage_requests",
    "manage_sanctions",
    "view_logs",
    "manage_docs",
    "manage_system",
    "view_compta",
    "manage_factures"
  ],
  rh: [
    "manage_employees",
    "manage_requests",
    "manage_sanctions"
  ],
  compta: [
    "view_compta",
    "manage_factures"
  ],
  employee: [
    "create_request",
    "view_personal_space"
  ],
  guest: []
};

function hasPermission(permission) {
  const role = getCurrentUserRole() || "guest";
  return (permissionsMap[role] || []).includes(permission);
}

function requirePermission(permission, message = "Action non autorisée.") {
  if (!hasPermission(permission)) {
    console.warn(`Permission refusée : ${permission}`);
    alert(message);
    return false;
  }
  return true;
}

export {
  hasPermission,
  requirePermission
};
