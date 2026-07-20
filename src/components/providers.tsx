"use client";

import { SessionProvider } from "next-auth/react";
import NextTopLoader from "nextjs-toploader";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <NextTopLoader
        color="#0ea5e9"
        height={3}
        initialPosition={0.12}
        crawlSpeed={180}
        easing="cubic-bezier(0.22, 1, 0.36, 1)"
        speed={280}
        shadow="0 0 12px rgb(14 165 233 / 0.45)"
        showSpinner={false}
        showForHashAnchor={false}
      />
      {children}
    </SessionProvider>
  );
}
