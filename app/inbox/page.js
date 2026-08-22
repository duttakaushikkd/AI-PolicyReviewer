"use client";

import { useEffect } from "react";
import ClaimCard from "@/components/ClaimCard";
import Nav from "@/components/Nav";
import { loadClientStore, pickRicherStore, saveClientStore } from "@/lib/client-store";
import { useClientStore } from "@/lib/use-client-store";

export default function InboxPage() {
  const store = useClientStore();
  const claims = store.claims.filter((claim) => claim.status === "escalated");

  useEffect(() => {
    fetch("/api/claims", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => {
        const merged = pickRicherStore(payload, loadClientStore());
        saveClientStore(merged);
      })
      .catch(() => {});
  }, []);

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
