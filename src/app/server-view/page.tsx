"use client";

import { useTideCloak } from "@tidecloak/nextjs";
import { useEffect, useState } from "react";
import { api, Shell, s } from "../ui";

export default function ServerViewPage() {
  const { authenticated } = useTideCloak();
  const [store, setStore] = useState<unknown>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authenticated) return;
    api("/api/server-view")
      .then((r) => (r.status === 200 ? setStore(r.data) : setError(r.status === 403 ? "This page is for university IT." : `Could not load (${r.status}).`)))
      .catch((err) => setError(String(err)));
  }, [authenticated]);

  return (
    <Shell title="What the server sees">
      <p>Everything SafeVoice's server holds. No key on this server can turn these back into reports.</p>
      {error && <p role="alert" style={s.error}>{error}</p>}
      {store !== null && <pre style={s.pre}>{JSON.stringify(store, null, 2)}</pre>}
    </Shell>
  );
}
