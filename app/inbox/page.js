"use client";

import { useCallback, useEffect, useState } from "react";
import ClaimCard from "@/components/ClaimCard";
import Nav from "@/components/Nav";
import {
  loadClientStore,
  pickRicherStore,
  saveClientStore,
  subscribeToClientStore,
} from "@/lib/client-store";

export default function InboxPage() {
  const [claims, setClaims] = useState(() =>
    loadClientStore().claims.filter((claim) => claim.status === "escalated"),
  );

  const applyStore = useCallback((store) => {
    setClaims((store.claims || []).filter((claim) => claim.status === "escalated"));
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToClientStore(applyStore);

    fetch("/api/claims", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => {
        const merged = pickRicherStore(payload, loadClientStore());
        saveClientStore(merged);
        applyStore(merged);
      })
      .catch(() => {});

    return unsubscribe;
  }, [applyStore]);

  return (
    <div className="page">
      <Nav current="/inbox" />
      <section className="panel">
        <div className="panel-head">
          <h2>Human inbox</h2>
          <p>Escalated claims wait here until a reviewer approves, denies, or asks for more information.</p>
        </div>
        <div className="stack">
          {claims.length === 0 ? (
            <p className="empty">No escalated claims.</p>
          ) : (
            claims.map((claim) => <ClaimCard key={claim.id} claim={claim} />)
          )}
        </div>
      </section>
    </div>
  );
}
