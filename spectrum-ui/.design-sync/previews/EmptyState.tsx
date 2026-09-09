import { EmptyState, Button } from '@spectrum-connect/ui';

export const NoProjects = () => (
  <div className="bg-gray-50 p-5 max-w-xl">
    <EmptyState
      icon="fa-solid fa-briefcase"
      title="No projects yet"
      description="Post your first project to start finding talented creators."
      action={<Button icon="fa-solid fa-plus">Create a Project</Button>}
    />
  </div>
);

export const NoResults = () => (
  <div className="bg-gray-50 p-5 max-w-xl">
    <EmptyState icon="fa-solid fa-magnifying-glass" title="No projects match your filter" description="Try a different filter or search term." />
  </div>
);
