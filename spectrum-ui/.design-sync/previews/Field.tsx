import { Field, TextInput, TextArea, Card, SectionHeader, Button } from '@spectrum-connect/ui';

export const PostAProject = () => (
  <div className="bg-gray-50 p-5 max-w-xl">
    <Card>
      <SectionHeader icon="fa-solid fa-circle-info" title="Project Information" subtitle="What are you working on?" />
      <div className="space-y-4">
        <Field label="Project Title" required htmlFor="t">
          <TextInput id="t" placeholder="e.g. Logo Design for Tech Startup" />
        </Field>
        <Field label="Project Description" required htmlFor="d" hint="0 characters — aim for at least 50">
          <TextArea id="d" placeholder="Describe your project in detail — what you need, your vision, any important context…" />
        </Field>
      </div>
    </Card>
  </div>
);

export const Filled = () => (
  <div className="bg-gray-50 p-5 max-w-xl">
    <Card>
      <Field label="Website" htmlFor="w" hint="We add https:// if you leave it off.">
        <TextInput id="w" defaultValue="epunmanula.com" />
      </Field>
    </Card>
  </div>
);

export const Invalid = () => (
  <div className="bg-gray-50 p-5 max-w-xl">
    <Card>
      <Field label="LinkedIn" htmlFor="l" error="LinkedIn is not a valid web address.">
        <TextInput id="l" defaultValue="hhshshsh" invalid />
      </Field>
    </Card>
  </div>
);

export const Actions = () => (
  <div className="bg-gray-50 p-5 max-w-xl">
    <Card>
      <div className="flex items-center justify-end gap-3">
        <Button variant="ghost">Cancel</Button>
        <Button icon="fa-solid fa-check">Save Changes</Button>
      </div>
    </Card>
  </div>
);
