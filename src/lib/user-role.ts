import { clearSessionCache } from "@/lib/session-cache";

export type UserRole = "admin" | "cashier";

const USER_ROLE_COOKIE_NAME = "userRole";
const USER_ROLE_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

function normalizeUserRole(value: string | null | undefined): UserRole | null {
  return value === "admin" || value === "cashier" ? value : null;
}

function getUserRoleFromCookie(): UserRole | null {
  if (typeof document === "undefined") {
    return null;
  }

  const cookieValue = document.cookie
    .split(";")
    .map((segment) => segment.trim())
    .find((segment) => segment.startsWith(`${USER_ROLE_COOKIE_NAME}=`))
    ?.slice(USER_ROLE_COOKIE_NAME.length + 1);

  return normalizeUserRole(cookieValue ?? null);
}

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

  const cookieRole = getUserRoleFromCookie();
  if (!cookieRole) {
    return null;
  }

  const storedRole = normalizeUserRole(localStorage.getItem(USER_ROLE_COOKIE_NAME));
  if (storedRole !== cookieRole) {
    localStorage.setItem(USER_ROLE_COOKIE_NAME, cookieRole);
  }

  return cookieRole;
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
  clearSessionCache();
  document.cookie = `${USER_ROLE_COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
  dispatchUserRoleChange();
}