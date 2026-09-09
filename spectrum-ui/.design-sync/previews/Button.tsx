import { Button } from '@spectrum-connect/ui';

export const Primary = () => (
  <div className="flex flex-wrap items-center gap-3">
    <Button variant="primary" icon="fa-solid fa-plus">New Project</Button>
    <Button variant="secondary">View Details</Button>
    <Button variant="ghost">Cancel</Button>
    <Button variant="danger">Withdraw</Button>
  </div>
);

export const Sizes = () => (
  <div className="flex flex-wrap items-center gap-3">
    <Button size="sm">Small</Button>
    <Button size="md">Medium</Button>
    <Button size="lg" icon="fa-solid fa-paper-plane">Apply Now</Button>
  </div>
);

export const States = () => (
  <div className="flex flex-wrap items-center gap-3">
    <Button>Default</Button>
    <Button loading>Saving</Button>
    <Button disabled>Disabled</Button>
  </div>
);

export const FullWidthOnMobile = () => (
  <div className="max-w-xs">
    <Button fullWidth size="lg" icon="fa-solid fa-lock">Fund Escrow</Button>
  </div>
);
