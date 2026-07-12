"use client";

import { firebaseEnv } from "@/lib/firebase/env";

export default function EnvBadge() {
  const env = firebaseEnv.appEnv;
  const projectId = firebaseEnv.projectId;

  if (!env || env === "production") {
    return null;
  }

  const isEmulator = env === "emulator";

  return (
    <div
      className={`fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold shadow-lg ${
        isEmulator ? "bg-purple-600 text-white" : "bg-orange-500 text-white"
      }`}
    >
      <span className="relative flex h-3 w-3">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75"></span>
        <span className="relative inline-flex h-3 w-3 rounded-full bg-white"></span>
      </span>
      {isEmulator ? "EMULATOR MODE" : "DEVELOPMENT MODE"}
      <span className="ml-2 rounded bg-black/20 px-2 py-0.5 font-mono text-[10px]">
        {projectId}
      </span>
    </div>
  );
}
