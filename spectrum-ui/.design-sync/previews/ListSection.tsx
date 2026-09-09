import { ListSection, Card, StatusPill, Money } from '@spectrum-connect/ui';

export const Grouped = () => (
  <div className="bg-gray-50 p-6">
    <ListSection title="Active Projects (2)" icon="fa-solid fa-briefcase">
      <Card compact><div className="flex justify-between items-center"><span className="font-semibold text-gray-900">Promotional Video</span><StatusPill status="in_progress" /></div></Card>
      <Card compact><div className="flex justify-between items-center"><span className="font-semibold text-gray-900">Brand Identity</span><StatusPill status="pending_funding" /></div></Card>
    </ListSection>
    <ListSection title="Completed History (1)" icon="fa-solid fa-trophy">
      <Card compact><div className="flex justify-between items-center"><span className="font-semibold text-gray-700">Logo Design · <Money amount={900} /></span><StatusPill status="completed" /></div></Card>
    </ListSection>
    <ListSection title="Archived (1)" icon="fa-solid fa-box-archive">
      <Card compact><div className="flex justify-between items-center opacity-75"><span className="font-semibold text-gray-700">Old Test Project</span><StatusPill status="removed" /></div></Card>
    </ListSection>
  </div>
);
