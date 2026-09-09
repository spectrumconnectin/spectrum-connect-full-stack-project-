import { PageHeader, Button } from '@spectrum-connect/ui';

export const WithAction = () => (
  <div className="bg-gray-50 p-6">
    <PageHeader
      title="My Projects"
      subtitle="Manage and track all your job postings"
      action={<Button icon="fa-solid fa-plus" size="lg">New Project</Button>}
    />
  </div>
);

export const TitleOnly = () => (
  <div className="bg-gray-50 p-6"><PageHeader title="Earnings" subtitle="What you've made and what's still in escrow" /></div>
);
