'use client';

import { useState } from 'react';
import { usePreferredCurrency } from '@/components/CurrencyProvider';

/**
 * Choose the currency the platform reads in.
 *
 * Worth being explicit with users that this changes presentation only: someone
 * switching to LKR should not fear that their existing agreements have been
 * re-priced.
 */

export default function CurrencySelector({ compact = false }: { compact?: boolean }) {
  const { currency, currencies, setCurrency, loading, ratesStale } = usePreferredCurrency();
  const [saving, setSaving] = useState(false);

  const choose = async (code: string) => {
    if (code === currency) return;
    setSaving(true);
    try {
      await setCurrency(code);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="h-10 w-40 bg-gray-100 rounded-xl animate-pulse" />;
  }

  const options = currencies.length
    ? currencies
    : [{ code: 'USD', name: 'US Dollar', symbol: '$', decimals: 2 }];

  if (compact) {
    return (
      <select
        value={currency}
        disabled={saving}
        onChange={e => choose(e.target.value)}
        aria-label="Display currency"
        className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-cobalt disabled:opacity-50"
      >
        {options.map(c => (
          <option key={c.code} value={c.code}>{c.symbol.trim()} {c.code}</option>
        ))}
      </select>
    );
  }

  return (
    <div>
      <label className="block text-sm font-semibold text-gray-900 mb-1.5">Display currency</label>
      <p className="text-sm text-gray-500 mb-3">
        Amounts across the platform are shown in this currency. Projects, escrow and
        payouts keep the currency they were agreed in — changing this never changes
        what you owe or are owed.
      </p>

      <div className="flex flex-wrap gap-2">
        {options.map(c => (
          <button
            key={c.code}
            type="button"
            disabled={saving}
            onClick={() => choose(c.code)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition disabled:opacity-50 ${
              currency === c.code
                ? 'border-cobalt bg-cobalt text-white'
                : 'border-gray-200 text-gray-700 hover:border-cobalt hover:bg-blue-50'
            }`}
          >
            {c.symbol.trim()} {c.code}
            <span className={`block text-[11px] font-normal ${currency === c.code ? 'text-blue-100' : 'text-gray-400'}`}>
              {c.name}
            </span>
          </button>
        ))}
      </div>

      {ratesStale && (
        <p className="text-xs text-amber-700 mt-3">
          <i className="fa-solid fa-triangle-exclamation mr-1.5"></i>
          Exchange rates couldn&apos;t be refreshed recently, so converted amounts may be
          out of date. Original amounts are unaffected.
        </p>
      )}
    </div>
  );
}
