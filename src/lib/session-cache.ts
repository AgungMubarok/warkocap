const canUseSessionStorage = () =>
  typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";

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

  window.sessionStorage.setItem(key, JSON.stringify(value));
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