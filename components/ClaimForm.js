"use client";

import { useState } from "react";
import {
  loadClientStore,
  mergeClaimIntoStore,
  pickRicherStore,
  saveClientStore,
} from "@/lib/client-store";

export default function ClaimForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    customer_id: "CUST-NEW",
    item_value_usd: 80,
    days_since_delivery: 7,
    prior_claims_90d: 0,
    claim_text: "",
  });

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function onSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          item_value_usd: Number(form.item_value_usd),
          days_since_delivery: Number(form.days_since_delivery),
          prior_claims_90d: Number(form.prior_claims_90d),
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Review failed");
      let snapshot = pickRicherStore(payload, loadClientStore());
      if (payload.claim) {
        snapshot = mergeClaimIntoStore(snapshot, payload.claim, payload.review);
      }
      saveClientStore(snapshot);
      setForm((current) => ({ ...current, claim_text: "" }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="panel form" onSubmit={onSubmit}>
      <div className="panel-head">
        <h2>Submit a claim</h2>
        <p>The agent retrieves policies, then auto-resolves or sends the case to inbox.</p>
      </div>
      <div className="form-grid">
        <label>
          Customer id
          <input
            value={form.customer_id}
            onChange={(e) => update("customer_id", e.target.value)}
          />
        </label>
        <label>
          Item value (USD)
          <input
            type="number"
            min="0"
            value={form.item_value_usd}
            onChange={(e) => update("item_value_usd", e.target.value)}
          />
        </label>
        <label>
          Days since delivery
          <input
            type="number"
            min="0"
            value={form.days_since_delivery}
            onChange={(e) => update("days_since_delivery", e.target.value)}
          />
        </label>
        <label>
          Prior claims (90d)
          <input
            type="number"
            min="0"
            value={form.prior_claims_90d}
            onChange={(e) => update("prior_claims_90d", e.target.value)}
          />
        </label>
      </div>
      <label>
        Claim text
        <textarea
          required
          rows={4}
          value={form.claim_text}
          onChange={(e) => update("claim_text", e.target.value)}
          placeholder="Describe the return, exchange, or warranty request"
        />
      </label>
      {error ? <p className="error">{error}</p> : null}
      <button type="submit" disabled={busy}>
        {busy ? "Reviewing…" : "Run policy review"}
      </button>
    </form>
  );
}
