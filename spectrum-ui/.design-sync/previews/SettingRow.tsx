import { SettingRow, Card } from '@spectrum-connect/ui';

export const Privacy = () => (
  <div className="bg-gray-50 p-5 max-w-lg">
    <Card>
      <h4 className="font-bold text-gray-900 mb-2">Privacy</h4>
      <div className="divide-y divide-gray-100">
        <SettingRow title="Show location on profile" on onToggle={() => {}} />
        <SettingRow title="Show spending on profile" on={false} onToggle={() => {}} />
        <SettingRow title="Two-factor authentication" description="Require a code at sign-in" on={false} onToggle={() => {}} />
      </div>
    </Card>
  </div>
);
