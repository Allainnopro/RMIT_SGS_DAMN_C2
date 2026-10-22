"use client";

import { TideCloakProvider } from "@tidecloak/nextjs";
import { SIMULATED } from "@/lib/simPersonas";
import tcConfig from "../../data/tidecloak.json";
import { SimAuthProvider } from "./auth";

// The provider takes the adapter JSON directly as the config prop.
// useDPoP goes inside the config object, not as a separate JSX prop (I-12).
export function Providers({ children }: { children: React.ReactNode }) {
  if (SIMULATED) return <SimAuthProvider>{children}</SimAuthProvider>;
  return (
    <TideCloakProvider
      config={{ ...tcConfig, useDPoP: { mode: "strict", alg: "ES256" } }}
    >
      {children}
    </TideCloakProvider>
  );
}
