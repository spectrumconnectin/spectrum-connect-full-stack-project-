import { ProgressBar, Card } from '@spectrum-connect/ui';

export const Milestones = () => (
  <div className="bg-gray-50 p-5 max-w-md">
    <Card>
      <div className="space-y-5">
        {[['Creator hired', 25], ['Escrow funded', 50], ['Delivery submitted', 75]].map(([l, p]) => (
          <div key={l as string}>
            <div className="flex justify-between text-sm mb-2">
              <span className="font-semibold text-gray-900">{l}</span>
              <span className="text-gray-400">{p}%</span>
            </div>
            <ProgressBar percent={p as number} />
          </div>
        ))}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="font-semibold text-gray-900">Payment released</span>
            <span className="text-emerald-600">Complete</span>
          </div>
          <ProgressBar percent={100} complete />
        </div>
      </div>
    </Card>
  </div>
);

export const OutOfRangeIsClamped = () => (
  <div className="bg-white p-5 max-w-md space-y-4">
    <ProgressBar percent={-20} />
    <ProgressBar percent={140} />
  </div>
);
