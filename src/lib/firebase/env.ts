const envMap: Record<string, string | undefined> = {
  NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
  NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export function requireEnv(name: string): string {
  const value = envMap[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const firebaseEnv = {
  get appEnv() {
    return requireEnv("NEXT_PUBLIC_APP_ENV");
  },
  get apiKey() {
    return requireEnv("NEXT_PUBLIC_FIREBASE_API_KEY");
  },
  get authDomain() {
    return requireEnv("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN");
  },
  get projectId() {
    return requireEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID");
  },
  get storageBucket() {
    return requireEnv("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET");
  },
  get messagingSenderId() {
    return requireEnv("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID");
  },
  get appId() {
    return requireEnv("NEXT_PUBLIC_FIREBASE_APP_ID");
  },
};
