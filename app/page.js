"use client";

import { useCallback, useEffect, useState } from "react";
import ClaimCard from "@/components/ClaimCard";
import ClaimForm from "@/components/ClaimForm";
import Nav from "@/components/Nav";
import SeedButton from "@/components/SeedButton";
import {
  countsFromClaims,
  loadClientStore,
  pickRicherStore,
  saveClientStore,
  subscribeToClientStore,
} from "@/lib/client-store";

export default function Dashboard() {
  const [claims, setClaims] = useState(() => loadClientStore().claims);

  const applyStore = useCallback((store) => {
    setClaims(store.claims || []);
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

  const summary = countsFromClaims(claims);
  const autoClaims = claims.filter((claim) => claim.status === "auto_resolved");
  const inboxClaims = claims.filter((claim) => claim.status === "escalated");

  return (
    <div className="page">
      <Nav current="/" />
      <section className="stats">
        <article>
          <span>Total</span>
          <strong>{summary.total}</strong>
        </article>
        <article>
          <span>Auto-reviewed</span>
          <strong>{summary.auto_resolved}</strong>
        </article>
        <article>
          <span>Inbox</span>
          <strong>{summary.escalated}</strong>
        </article>
        <article>
          <span>Human resolved</span>
          <strong>{summary.human_resolved}</strong>
        </article>
      </section>

      <SeedButton />
      <ClaimForm />

      <section className="queues">
        <div>
          <div className="queue-head">
            <h2>Auto-reviewed</h2>
            <span className="badge auto">agent</span>
          </div>
          <div className="stack">
            {autoClaims.length === 0 ? (
              <p className="empty">No auto-resolved claims yet.</p>
            ) : (
              autoClaims.map((claim) => <ClaimCard key={claim.id} claim={claim} />)
            )}
          </div>
        </div>
        <div>
          <div className="queue-head">
            <h2>Inbox</h2>
            <span className="badge escalate">human</span>
          </div>
          <div className="stack">
            {inboxClaims.length === 0 ? (
              <p className="empty">Inbox is clear.</p>
            ) : (
              inboxClaims.map((claim) => <ClaimCard key={claim.id} claim={claim} />)
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
