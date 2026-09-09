import { TextArea, Field, Card } from '@spectrum-connect/ui';

export const Brief = () => (
  <div className="bg-gray-50 p-5 max-w-xl">
    <Card>
      <Field label="Project Description" required htmlFor="d" hint="0 characters — aim for at least 50">
        <TextArea id="d" placeholder="Describe your project in detail — what you need, your vision, any important context…" />
      </Field>
    </Card>
  </div>
);

export const Filled = () => (
  <div className="bg-gray-50 p-5 max-w-xl">
    <Card>
      <Field label="Cover letter" htmlFor="c">
        <TextArea id="c" rows={4} defaultValue="I've cut brand films for coffee roasters before and can turn your raw footage around in under a week. Happy to share a rough cut at day three." />
      </Field>
    </Card>
  </div>
);
