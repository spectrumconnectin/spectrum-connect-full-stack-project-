import { SectionHeader, Card } from '@spectrum-connect/ui';

export const FormSections = () => (
  <div className="bg-gray-50 p-5 max-w-2xl space-y-4">
    <Card>
      <SectionHeader icon="fa-solid fa-circle-info" title="Project Information" subtitle="What are you working on?" />
    </Card>
    <Card>
      <SectionHeader icon="fa-solid fa-sack-dollar" title="Budget &amp; Timeline" subtitle="What can you spend, and by when?" iconClass="bg-emerald-100 text-emerald-600" />
    </Card>
    <Card>
      <SectionHeader icon="fa-solid fa-users" title="Roles" subtitle="Who do you need on this project?" iconClass="bg-purple-100 text-purple-600" />
    </Card>
  </div>
);
