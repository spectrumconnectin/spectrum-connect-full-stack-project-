import { WelcomeBanner, Button } from '@spectrum-connect/ui';

export const Client = () => (
  <div className="bg-gray-50 p-6">
    <WelcomeBanner
      name="Pulindu Pansilu"
      message="You have 3 active projects."
      action={<Button variant="white" size="lg" icon="fa-solid fa-plus">Create a Project</Button>}
    />
  </div>
);

export const Creator = () => (
  <div className="bg-gray-50 p-6">
    <WelcomeBanner
      name="Epun Manula"
      message="Two clients are reviewing your proposals right now."
      action={<Button variant="white" size="lg" icon="fa-solid fa-magnifying-glass">Find Projects</Button>}
    />
  </div>
);
