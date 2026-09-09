import { BottomNav } from '@spectrum-connect/ui';

export const CreatorTabs = () => (
  <div className="relative h-24 bg-gray-50">
    <BottomNav items={[
      { label: 'Home', icon: 'fa-solid fa-house', active: true },
      { label: 'Discover', icon: 'fa-solid fa-compass' },
      { label: 'Projects', icon: 'fa-solid fa-briefcase' },
      { label: 'Messages', icon: 'fa-solid fa-comment' },
      { label: 'Profile', icon: 'fa-solid fa-user' },
    ]} />
  </div>
);

export const ClientTabs = () => (
  <div className="relative h-24 bg-gray-50">
    <BottomNav items={[
      { label: 'Home', icon: 'fa-solid fa-house' },
      { label: 'Creators', icon: 'fa-solid fa-users' },
      { label: 'Projects', icon: 'fa-solid fa-briefcase', active: true },
      { label: 'Messages', icon: 'fa-solid fa-comment' },
    ]} />
  </div>
);
