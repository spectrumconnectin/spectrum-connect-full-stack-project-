import { StatGrid, Stat } from '@spectrum-connect/ui';

export const CreatorStats = () => (
  <div className="bg-gray-50 p-6">
    <StatGrid>
      <Stat label="Total Applied" value={12} icon="fa-solid fa-paper-plane" />
      <Stat label="Under Review" value={4} icon="fa-solid fa-clock" iconClass="bg-amber-50 text-amber-600" />
      <Stat label="Shortlisted" value={2} icon="fa-solid fa-star" iconClass="bg-purple-50 text-purple-600" />
      <Stat label="Hired" value={3} icon="fa-solid fa-circle-check" iconClass="bg-emerald-50 text-emerald-600" />
    </StatGrid>
  </div>
);

export const EarningsStats = () => (
  <div className="bg-gray-50 p-6">
    <StatGrid>
      <Stat label="In Escrow" value="$1,840" icon="fa-solid fa-shield-halved" iconClass="bg-emerald-50 text-emerald-600" note="3 projects funded" />
      <Stat label="Available" value="$920" icon="fa-solid fa-wallet" note="Ready to withdraw" />
      <Stat label="Withdrawn" value="$8,300" icon="fa-solid fa-building-columns" iconClass="bg-gray-100 text-gray-500" note="Lifetime" />
      <Stat label="Platform Fee" value="8%" icon="fa-solid fa-percent" iconClass="bg-amber-50 text-amber-600" note="Creator side" />
    </StatGrid>
  </div>
);
