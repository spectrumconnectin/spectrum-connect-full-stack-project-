import { StatusPill } from '@spectrum-connect/ui';

export const Live = () => (
  <div className="flex flex-wrap gap-2 p-2">
    <StatusPill status="open" /><StatusPill status="in_review" />
    <StatusPill status="pending_funding" /><StatusPill status="in_progress" />
    <StatusPill status="delivered" /><StatusPill status="revision_requested" />
  </div>
);

export const Terminal = () => (
  <div className="flex flex-wrap gap-2 p-2">
    <StatusPill status="approved" /><StatusPill status="completed" />
    <StatusPill status="removed" /><StatusPill status="cancelled" />
    <StatusPill status="draft" />
  </div>
);

export const UnknownFallsBackVisibly = () => (
  <div className="flex flex-wrap gap-2 p-2">
    <StatusPill status="completed" />
    <StatusPill status="awaiting_signature" />
  </div>
);
