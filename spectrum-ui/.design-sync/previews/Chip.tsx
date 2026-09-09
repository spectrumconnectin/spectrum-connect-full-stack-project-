import { Chip } from '@spectrum-connect/ui';

export const Skills = () => (
  <div className="p-4 flex flex-wrap gap-2">
    <Chip>Video Editing</Chip><Chip>Color Grading</Chip><Chip>Motion Graphics</Chip>
    <Chip>Cinematography</Chip><Chip>Sound Design</Chip>
  </div>
);

export const Selected = () => (
  <div className="p-4 flex flex-wrap gap-2">
    <Chip selected onClick={() => {}}>DaVinci Resolve</Chip>
    <Chip onClick={() => {}}>Premiere Pro</Chip>
    <Chip onClick={() => {}}>After Effects</Chip>
  </div>
);
