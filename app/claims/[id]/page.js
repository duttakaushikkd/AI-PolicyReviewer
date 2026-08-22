import Link from "next/link";
import { notFound } from "next/navigation";
import HumanDecision from "@/components/HumanDecision";
import Nav from "@/components/Nav";
import { getClaim, getReviewsForClaim } from "@/lib/db";
import { formatAction, formatMoney } from "@/lib/format";
import { getPoliciesByIds } from "@/lib/policies";

export const dynamic = "force-dynamic";

export default async function ClaimWorkspace({ params }) {
  const { id } = await params;
  const claim = await getClaim(id);
  if (!claim) notFound();

  const reviews = await getReviewsForClaim(id);
  const latestAgent = reviews.find((review) => review.actor === "agent");
  const policyIds = [
    ...(latestAgent?.retrieved_policy_ids || []),
    ...(latestAgent?.cited_policy_ids || []),
  ];
  const policies = await getPoliciesByIds(policyIds);
  const policyMap = Object.fromEntries(policies.map((policy) => [policy.id, policy]));

  return (
    <div className="page">
      <Nav current={claim.status === "escalated" ? "/inbox" : "/"} />
      <p className="crumb">
        <Link href="/">Queues</Link> / {claim.id}
      </p>

      <section className="split">
        <article className="panel">
          <div className="panel-head">
            <h2>Claim {claim.id}</h2>
            <span
              className={
                claim.status === "auto_resolved"
                  ? "badge auto"
                  : claim.status === "escalated"
                    ? "badge escalate"
                    : "badge human"
              }
            >
              {claim.status.replaceAll("_", " ")}
            </span>
          </div>
          <p className="claim-body">{claim.claim_text}</p>
          <dl className="meta-grid">
            <div>
              <dt>Customer</dt>
              <dd>{claim.customer_id}</dd>
            </div>
            <div>
              <dt>Value</dt>
              <dd>{formatMoney(claim.item_value_usd)}</dd>
            </div>
            <div>
              <dt>Days since delivery</dt>
              <dd>{claim.days_since_delivery}</dd>
            </div>
            <div>
              <dt>Prior claims (90d)</dt>
              <dd>{claim.prior_claims_90d}</dd>
            </div>
          </dl>
          {claim.expected_type ? (
            <p className="hint">Sample label: {claim.expected_type}</p>
          ) : null}
        </article>

        <article className="panel">
          <div className="panel-head">
            <h2>Agent recommendation</h2>
          </div>
          {latestAgent ? (
            <>
              <p>
                <strong>{formatAction(latestAgent.action)}</strong> via {latestAgent.route} route
                {" · "}
                {(latestAgent.confidence * 100).toFixed(0)}% confidence
              </p>
              <p>{latestAgent.rationale}</p>
              <p className="hint">{latestAgent.customer_message}</p>
              {latestAgent.missing_evidence?.length ? (
                <p className="hint">Missing: {latestAgent.missing_evidence.join(", ")}</p>
              ) : null}
            </>
          ) : (
            <p className="empty">No agent review yet.</p>
          )}
        </article>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Retrieved policies</h2>
        </div>
        <div className="policy-list">
          {(latestAgent?.retrieved_policy_ids || []).map((policyId) => {
            const policy = policyMap[policyId];
            if (!policy) return null;
            return (
              <article key={policyId}>
                <h3>
                  {policy.id} · {policy.title}
                  <span className={policy.confidence_tag === "escalate_required" ? "badge escalate" : "badge auto"}>
                    {policy.confidence_tag.replaceAll("_", " ")}
                  </span>
                </h3>
                <p>{policy.policy_text}</p>
              </article>
            );
          })}
        </div>
      </section>

      {claim.status === "escalated" ? <HumanDecision claimId={claim.id} /> : null}

      <section className="panel">
        <div className="panel-head">
          <h2>Decision history</h2>
        </div>
        <ol className="history">
          {reviews.map((review) => (
            <li key={review.id}>
              <strong>{review.actor}</strong> · {formatAction(review.action)} · {review.route}
              <p>{review.rationale}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
