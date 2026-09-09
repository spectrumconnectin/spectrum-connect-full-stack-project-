import { Money, Card } from '@spectrum-connect/ui';

export const Currencies = () => (
  <div className="p-4 space-y-2 text-lg font-semibold text-gray-900">
    <div><Money amount={1750} currency="USD" /></div>
    <div><Money amount={1420.5} currency="EUR" /></div>
    <div><Money amount={1180} currency="GBP" /></div>
    <div><Money amount={17483} currency="LKR" /></div>
  </div>
);

export const ZeroDecimalCurrencies = () => (
  <div className="p-4 space-y-2 text-sm text-gray-700">
    <div>LKR has no minor unit: <span className="font-semibold text-gray-900"><Money amount={17483} currency="LKR" /></span></div>
    <div>USD does: <span className="font-semibold text-gray-900"><Money amount={17483} currency="USD" /></span></div>
  </div>
);

export const MixedCurrencyList = () => (
  <div className="bg-gray-50 p-5 max-w-md">
    <Card compact>
      <p className="text-xs text-gray-500 mb-2">Budgets are stored per project, so one list can legitimately mix currencies — the code is shown when it varies.</p>
      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between"><span className="text-gray-600">Promotional Video</span><span className="font-semibold"><Money amount={1750} currency="USD" showCode /></span></div>
        <div className="flex justify-between"><span className="text-gray-600">Film rrrrrrr</span><span className="font-semibold"><Money amount={17483} currency="LKR" showCode /></span></div>
      </div>
    </Card>
  </div>
);

export const Rates = () => (
  <div className="p-4 space-x-4 text-sm font-semibold text-gray-900">
    <Money amount={15} suffix="/hr" /><Money amount={480} suffix="/day" /><Money amount={2200} suffix="/wk" />
  </div>
);
