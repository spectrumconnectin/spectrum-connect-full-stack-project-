import { Toggle, SettingRow, Card } from '@spectrum-connect/ui';

export const Switch = () => (
  <div className="flex items-center gap-6 p-4">
    <Toggle on onToggle={() => {}} label="On" />
    <Toggle on={false} onToggle={() => {}} label="Off" />
    <Toggle on disabled onToggle={() => {}} label="Disabled" />
  </div>
);

export const NotificationSettings = () => (
  <div className="bg-gray-50 p-5 max-w-lg">
    <Card>
      <h4 className="font-bold text-gray-900 mb-2">Notifications</h4>
      <div className="divide-y divide-gray-100">
        <SettingRow title="New creator matches" description="Get notified when Smart Connect finds a creator for your project" on onToggle={() => {}} />
        <SettingRow title="Application updates" description="Status changes on projects you posted" on onToggle={() => {}} />
        <SettingRow title="Messages" description="New messages from creators" on={false} onToggle={() => {}} />
        <SettingRow title="Weekly digest" description="A summary of your activity each Monday" on={false} onToggle={() => {}} />
      </div>
    </Card>
  </div>
);
