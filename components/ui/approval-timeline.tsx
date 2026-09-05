import React from "react";

interface ApprovalTimelineProps {
  requesterName: string;
  requesterInitials: string;
  requestDate: string;
  approverName?: string;
  approverInitials?: string;
  status: "TO_APPROVE" | "APPROVED" | "REFUSED" | "CANCELLED" | string;
  decisionDate?: string;
  decisionNote?: string;
}

export function ApprovalTimeline({
  requesterName,
  requesterInitials,
  requestDate,
  approverName = "Manager",
  approverInitials = "MG",
  status,
  decisionDate,
  decisionNote,
}: ApprovalTimelineProps) {
  const isApproved = status === "APPROVED";
  const isRefused = status === "REFUSED";

  return (
    <div className="timeline">
      <div>
        <span className="timeline-dot">{requesterInitials}</span>
        <p>
          <b>{requesterName}</b> submitted request <small>{requestDate}</small>
        </p>
      </div>
      <div>
        <span className="timeline-dot manager">{approverInitials}</span>
        <p>
          <b>{approverName}</b>{" "}
          {isApproved
            ? "approved"
            : isRefused
            ? "refused"
            : "is reviewing"}{" "}
          <small>{decisionDate || "Awaiting decision"}</small>
        </p>
        {decisionNote && <blockquote>“{decisionNote}”</blockquote>}
      </div>
    </div>
  );
}
