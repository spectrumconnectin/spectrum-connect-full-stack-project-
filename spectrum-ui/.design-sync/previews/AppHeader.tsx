import { AppHeader } from '@spectrum-connect/ui';

export const Creator = () => (
  <AppHeader links={['Dashboard', 'Find Projects', 'Smart Connect', 'My Work']} hasNotifications hasMessages />
);

export const Client = () => (
  <AppHeader links={['Dashboard', 'My Projects', 'Smart Connect', 'Payments']} user="Pulindu Pansilu" />
);

export const Quiet = () => <AppHeader links={['Dashboard', 'My Projects']} />;
