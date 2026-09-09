import { FilterRow, Chip, Card } from '@spectrum-connect/ui';

const STATUSES = ['All', 'open', 'in_review', 'pending_funding', 'in_progress', 'delivered', 'completed', 'removed'];
const LABELS: Record<string, string> = {
  All: 'All', open: 'Open', in_review: 'In Review', pending_funding: 'Pending Funding',
  in_progress: 'Active', delivered: 'Delivered', completed: 'Completed', removed: 'Removed',
};

export const ProjectFilters = () => (
  <div className="bg-gray-50 p-5">
    <Card>
      <FilterRow options={STATUSES} active="All" onChange={() => {}} labelFor={(v) => LABELS[v] ?? v} />
    </Card>
  </div>
);

export const Selected = () => (
  <div className="bg-gray-50 p-5">
    <Card>
      <FilterRow options={STATUSES} active="in_progress" onChange={() => {}} labelFor={(v) => LABELS[v] ?? v} />
    </Card>
  </div>
);

export const Chips = () => (
  <div className="p-4 flex flex-wrap gap-2">
    <Chip>Video Editing</Chip><Chip>Color Grading</Chip>
    <Chip selected>DaVinci Resolve</Chip><Chip>Motion Graphics</Chip><Chip>Sound Design</Chip>
  </div>
);
