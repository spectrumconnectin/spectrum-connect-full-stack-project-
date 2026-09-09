import { Card, SectionHeader, StatusPill, Chip, Button, Money } from '@spectrum-connect/ui';

export const ProjectCard = () => (
  <div className="bg-gray-50 p-5 max-w-2xl">
    <Card>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="min-w-0">
          <h3 className="text-lg font-bold text-gray-900 mb-1">Promotional Video for Coffee Roasters</h3>
          <p className="text-sm text-gray-500">Film &amp; Video · Videographer</p>
        </div>
        <StatusPill status="open" />
      </div>
      <div className="flex flex-wrap gap-1.5 mb-4">
        <Chip>Video Editing</Chip><Chip>Color Grading</Chip><Chip>Motion Graphics</Chip>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm mb-4">
        <div><p className="text-gray-500 mb-1">Budget</p><p className="font-semibold text-gray-900"><Money amount={1750} /></p></div>
        <div><p className="text-gray-500 mb-1">Complexity</p><p className="font-semibold text-gray-900">Intermediate</p></div>
        <div><p className="text-gray-500 mb-1">Crew Size</p><p className="font-semibold text-gray-900">Small crew</p></div>
        <div><p className="text-gray-500 mb-1">Proposals</p><p className="font-semibold text-gray-900">4 received</p></div>
      </div>
      <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
        <span className="text-xs text-gray-400">Posted 3d ago</span>
        <Button size="sm">Review applicants</Button>
      </div>
    </Card>
  </div>
);

export const Compact = () => (
  <div className="bg-gray-50 p-5 max-w-md space-y-3">
    <Card compact>
      <p className="font-semibold text-gray-900">Logo Design for Acme Coffee</p>
      <p className="text-xs text-gray-400 mt-0.5">Design · <Money amount={900} /></p>
    </Card>
    <Card compact interactive>
      <p className="font-semibold text-gray-900">Interactive — border lifts on hover</p>
      <p className="text-xs text-gray-400 mt-0.5">Use for cards that are links</p>
    </Card>
  </div>
);

export const Sections = () => (
  <div className="bg-gray-50 p-5 max-w-2xl space-y-4">
    <Card>
      <SectionHeader icon="fa-solid fa-circle-info" title="Project Information" subtitle="What are you working on?" />
      <p className="text-sm text-gray-500">Section body.</p>
    </Card>
    <Card>
      <SectionHeader icon="fa-solid fa-sack-dollar" title="Budget &amp; Timeline" subtitle="What can you spend?" iconClass="bg-emerald-100 text-emerald-600" />
      <p className="text-sm text-gray-500">Section body.</p>
    </Card>
  </div>
);
