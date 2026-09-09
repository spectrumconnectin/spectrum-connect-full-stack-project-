import { TextInput, Field, Card } from '@spectrum-connect/ui';

export const States = () => (
  <div className="bg-gray-50 p-5 max-w-md">
    <Card>
      <div className="space-y-4">
        <Field label="Empty" htmlFor="a"><TextInput id="a" placeholder="e.g. Logo Design for Tech Startup" /></Field>
        <Field label="Filled" htmlFor="b"><TextInput id="b" defaultValue="Promotional Video for Coffee Roasters" /></Field>
        <Field label="Invalid" htmlFor="c" error="Not a valid web address."><TextInput id="c" defaultValue="hhshshsh" invalid /></Field>
        <Field label="Disabled" htmlFor="d"><TextInput id="d" defaultValue="Locked" disabled /></Field>
      </div>
    </Card>
  </div>
);
