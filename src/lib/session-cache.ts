const canUseSessionStorage = () =>
  typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";

const MANAGED_SESSION_CACHE_PREFIX = "kuasir:v2:";

function getManagedSessionCacheKeys() {
  if (!canUseSessionStorage()) {
    return [] as string[];
  }

  const managedKeys: string[] = [];

  for (let index = 0; index < window.sessionStorage.length; index += 1) {
    const key = window.sessionStorage.key(index);

    if (key?.startsWith(MANAGED_SESSION_CACHE_PREFIX)) {
      managedKeys.push(key);
    }
  }

  return managedKeys;
}

function isQuotaExceededError(error: unknown) {
  if (!(error instanceof DOMException)) {
    return false;
  }

  return (
    error.name === "QuotaExceededError" ||
    error.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    error.code === 22 ||
    error.code === 1014
  );
}

function clearManagedSessionCache() {
  getManagedSessionCacheKeys().forEach((key) => {
    window.sessionStorage.removeItem(key);
  });
}

export function readSessionCache<T>(key: string): T | null {
  if (!canUseSessionStorage()) {
    return null;
  }

  try {
    const rawValue = window.sessionStorage.getItem(key);

    if (!rawValue) {
      return null;
    }

    return JSON.parse(rawValue) as T;
  } catch {
    return null;
  }
}

export function writeSessionCache<T>(key: string, value: T) {
  if (!canUseSessionStorage()) {
    return;
  }

  const serializedValue = JSON.stringify(value);

  try {
    window.sessionStorage.setItem(key, serializedValue);
  } catch (error) {
    if (!isQuotaExceededError(error)) {
      return;
    }

    clearManagedSessionCache();

    try {
      window.sessionStorage.setItem(key, serializedValue);
    } catch {
      // Skip cache writes when the browser storage quota is full.
    }
  }
}

export function removeSessionCacheByPrefix(prefix: string) {
  if (!canUseSessionStorage()) {
    return;
  }

  const keysToDelete: string[] = [];

  for (let index = 0; index < window.sessionStorage.length; index += 1) {
    const key = window.sessionStorage.key(index);

    if (key?.startsWith(prefix)) {
      keysToDelete.push(key);
    }
  }

  keysToDelete.forEach((key) => window.sessionStorage.removeItem(key));
}

export function clearSessionCache() {
  if (!canUseSessionStorage()) {
    return;
  }

  window.sessionStorage.clear();
}