"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const HUMAN_ACTIONS = [
  { id: "approve_refund", label: "Approve refund" },
  { id: "approve_exchange", label: "Approve exchange" },
  { id: "approve_replacement", label: "Approve replacement" },
  { id: "deny", label: "Deny" },
  { id: "request_info", label: "Request info" },
];

export default function HumanDecision({ claimId }) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function decide(action) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/claims/${claimId}/human-decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, notes }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Decision failed");
      setNotes("");
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Human decision</h2>
        <p>Inbox cases stay here until you approve, deny, or request more information.</p>
      </div>
      <label>
        Notes
        <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>
      {error ? <p className="error">{error}</p> : null}
      <div className="actions">
        {HUMAN_ACTIONS.map((item) => (
          <button
            key={item.id}
            type="button"
            disabled={busy}
            className={item.id === "deny" ? "danger" : undefined}
            onClick={() => decide(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </section>
  );
}
