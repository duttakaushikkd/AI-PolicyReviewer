"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SeedButton() {
  const router = useRouter();
  const [seeding, setSeeding] = useState(false);
  const [message, setMessage] = useState("");

  async function seed() {
    setSeeding(true);
    setMessage("Seeding sample claims… this runs RAG + the review agent for each case.");
    try {
      const response = await fetch("/api/claims/seed", { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Seed failed");
      const auto = payload.results.filter((r) => r.status === "auto_resolved").length;
      const inbox = payload.results.filter((r) => r.status === "escalated").length;
      setMessage(`Seed complete: ${auto} auto-reviewed, ${inbox} sent to inbox.`);
      router.refresh();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div className="toolbar">
      <button type="button" onClick={seed} disabled={seeding}>
        {seeding ? "Loading samples…" : "Load sample claims"}
      </button>
      {message ? <p className="hint">{message}</p> : null}
    </div>
  );
}
