export type UserRole = "admin" | "cashier";

const USER_ROLE_COOKIE_NAME = "userRole";
const USER_ROLE_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

export function subscribeToUserRole(callback: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleChange = () => callback();

  window.addEventListener("storage", handleChange);
  window.addEventListener("userRoleChange", handleChange);

  return () => {
    window.removeEventListener("storage", handleChange);
    window.removeEventListener("userRoleChange", handleChange);
  };
}

export function getUserRoleSnapshot(): UserRole | null {
  if (typeof window === "undefined") {
    return null;
  }

  const storedRole = localStorage.getItem("userRole");
  return storedRole === "admin" || storedRole === "cashier" ? storedRole : null;
}

export function getUserRoleServerSnapshot() {
  return null;
}

export function dispatchUserRoleChange() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event("userRoleChange"));
}

export function persistUserRole(role: UserRole) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(USER_ROLE_COOKIE_NAME, role);
  document.cookie = `${USER_ROLE_COOKIE_NAME}=${role}; path=/; max-age=${USER_ROLE_COOKIE_MAX_AGE}; SameSite=Lax`;
  dispatchUserRoleChange();
}

export function clearPersistedUserRole() {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(USER_ROLE_COOKIE_NAME);
  document.cookie = `${USER_ROLE_COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
  dispatchUserRoleChange();
}