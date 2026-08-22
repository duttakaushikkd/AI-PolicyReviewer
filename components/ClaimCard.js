import Link from "next/link";
import { formatAction, formatMoney } from "@/lib/format";

export default function ClaimCard({ claim, review }) {
  const status = claim.status;
  const badgeClass =
    status === "auto_resolved"
      ? "badge auto"
      : status === "escalated"
        ? "badge escalate"
        : status === "human_resolved"
          ? "badge human"
          : "badge pending";

  return (
    <Link href={`/claims/${claim.id}`} className="claim-card">
      <div className="claim-card-top">
        <strong>{claim.id}</strong>
        <span className={badgeClass}>{status.replaceAll("_", " ")}</span>
      </div>
      <p className="claim-snippet">{claim.claim_text}</p>
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
          <dt>Days</dt>
          <dd>{claim.days_since_delivery}</dd>
        </div>
        <div>
          <dt>Prior 90d</dt>
          <dd>{claim.prior_claims_90d}</dd>
        </div>
      </dl>
      {review ? (
        <p className="review-line">
          Agent: {formatAction(review.action)} · {(review.confidence * 100).toFixed(0)}%
        </p>
      ) : null}
    </Link>
  );
}
