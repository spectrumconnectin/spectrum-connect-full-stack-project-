import { Stat, EmptyState, ProgressBar, Button } from '@spectrum-connect/ui';

export const DashboardRow = () => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 bg-gray-50 p-5">
    <Stat label="Total Applied" value={12} icon="fa-solid fa-paper-plane" iconClass="bg-blue-50 text-cobalt" />
    <Stat label="Under Review" value={4} icon="fa-solid fa-clock" iconClass="bg-amber-50 text-amber-600" />
    <Stat label="Shortlisted" value={2} icon="fa-solid fa-star" iconClass="bg-purple-50 text-purple-600" />
    <Stat label="Hired" value={3} icon="fa-solid fa-circle-check" iconClass="bg-emerald-50 text-emerald-600" />
  </div>
);

export const WithNote = () => (
  <div className="grid grid-cols-2 gap-5 bg-gray-50 p-5">
    <Stat label="In Escrow" value="$1,840" icon="fa-solid fa-shield-halved" iconClass="bg-emerald-50 text-emerald-600" note="3 projects funded" />
    <Stat label="Released" value="$9,220" icon="fa-solid fa-arrow-up-right-from-square" iconClass="bg-blue-50 text-cobalt" note="Lifetime earnings" />
  </div>
);

export const Empty = () => (
  <EmptyState
    icon="fa-solid fa-briefcase"
    title="No projects yet"
    description="Post your first project to start finding talented creators."
    action={<Button icon="fa-solid fa-plus">Create a Project</Button>}
  />
);

export const Progress = () => (
  <div className="space-y-5 bg-white p-6 max-w-md">
    <div>
      <p className="text-sm font-semibold text-gray-900 mb-2">Escrow funded — 2 of 4 milestones</p>
      <ProgressBar percent={50} />
    </div>
    <div>
      <p className="text-sm font-semibold text-gray-900 mb-2">Project complete</p>
      <ProgressBar percent={100} complete />
    </div>
  </div>
);
