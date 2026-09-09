import { PresenceDot, Avatar } from '@spectrum-connect/ui';

export const States = () => (
  <div className="p-4 flex flex-col gap-3">
    <PresenceDot online />
    <PresenceDot />
    <PresenceDot label="Last seen 2 days ago" />
  </div>
);

export const OnACreatorRow = () => (
  <div className="p-4 flex items-center gap-3">
    <Avatar name="Petar Dojranliev" size={40} />
    <div>
      <p className="font-semibold text-gray-900 text-sm">Petar Dojranliev</p>
      <PresenceDot online />
    </div>
  </div>
);
