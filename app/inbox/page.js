import ClaimCard from "@/components/ClaimCard";
import Nav from "@/components/Nav";
import { listClaims } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const claims = await listClaims("escalated");

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
