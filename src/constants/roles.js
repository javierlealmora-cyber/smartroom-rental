// src/constants/roles.js
// Centralized role constants for the 3-portal architecture

export const MANAGER_ROLES = ["superadmin", "admin", "api", "agent", "viewer"];
export const LODGER_ROLES = ["lodger"];

export function isManagerRole(role) {
  return MANAGER_ROLES.includes(role);
}

export function isLodgerRole(role) {
  return LODGER_ROLES.includes(role);
}

/**
 * Returns the portal home path for a given role.
 * Used after login to determine where to redirect.
 */
export function getPortalHomeForRole(role) {
  if (role === "superadmin") return "/v2/superadmin";
  if (isLodgerRole(role)) return "/v2/lodger/dashboard";
  if (isManagerRole(role)) return "/v2/manager/dashboard";
  return "/v2/manager/dashboard";
}
