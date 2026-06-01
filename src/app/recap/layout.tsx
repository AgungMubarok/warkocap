"use client";

import type { ReactNode } from "react";
import withAuth from "@/hooks/withAuth";
import RecapLayoutClient from "./_components/RecapLayoutClient";

function RecapLayout({ children }: { children: ReactNode }) {
  return <RecapLayoutClient>{children}</RecapLayoutClient>;
}

export default withAuth(RecapLayout, ["admin"]);