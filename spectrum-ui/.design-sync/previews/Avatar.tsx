import { Avatar, PresenceDot, Chip, Card, Money } from '@spectrum-connect/ui';

export const Sizes = () => (
  <div className="flex items-end gap-4 p-4">
    <Avatar name="Epun Manula" size={24} />
    <Avatar name="Epun Manula" size={32} />
    <Avatar name="Epun Manula" size={44} />
    <Avatar name="Epun Manula" size={64} />
  </div>
);

export const GradientIsDerivedFromTheName = () => (
  <div className="flex flex-wrap gap-3 p-4">
    {['Epun Manula', 'Petar Dojranliev', 'Lakshika Herath', 'Pasan Bandara', 'Nasir Sultan'].map((n) => (
      <div key={n} className="flex items-center gap-2">
        <Avatar name={n} size={36} />
        <span className="text-xs text-gray-600">{n}</span>
      </div>
    ))}
  </div>
);

export const Presence = () => (
  <div className="flex flex-col gap-2 p-4">
    <PresenceDot online />
    <PresenceDot />
    <PresenceDot label="Last seen 2 days ago" />
  </div>
);

export const CreatorRow = () => (
  <div className="bg-gray-50 p-5 max-w-md">
    <Card compact>
      <div className="flex items-center gap-3">
        <Avatar name="Epun Manula" size={44} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-900 truncate">Epun Manula</p>
          <p className="text-xs text-cobalt">Videographer &amp; Film Editor</p>
          <PresenceDot online />
        </div>
        <span className="text-sm font-semibold text-gray-900"><Money amount={15} suffix="/hr" /></span>
      </div>
      <div className="flex flex-wrap gap-1.5 mt-3">
        <Chip>Video Editing</Chip><Chip>Cinematography</Chip>
      </div>
    </Card>
  </div>
);
