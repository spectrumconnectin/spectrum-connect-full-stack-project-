'use client';

import { useState } from 'react';
import { earnings, BankDetails } from '@/lib/api';

/**
 * Bank details for direct payouts.
 *
 * For creators in countries the card networks' payout rails don't reach — Sri
 * Lanka above all — this is the route that puts money in their own account
 * without them opening a wallet anywhere.
 *
 * The account number is sent to the payment provider and is not stored by
 * Spectrum; once saved, only a masked last-four comes back.
 */

const inp =
  'w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none ' +
  'focus:ring-2 focus:ring-cobalt focus:border-transparent text-gray-900 placeholder-gray-400 text-sm';

interface Props {
  details: BankDetails | null;
  onSaved: (d: { account_masked: string; bank_name: string; currency: string }) => void;
  /** Creator's country, used to default the corridor. */
  country?: string | null;
}

export default function BankPayoutForm({ details, onSaved, country }: Props) {
  const [editing, setEditing] = useState(!details?.connected);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [accountName, setAccountName] = useState(details?.account_name ?? '');
  const [accountNumber, setAccountNumber] = useState('');
  const [bankName, setBankName] = useState(details?.bank_name ?? '');
  const [branch, setBranch] = useState('');
  const [swift, setSwift] = useState('');

  const isLK = (country ?? details?.country ?? 'LK').toUpperCase() === 'LK';
  const currency = isLK ? 'LKR' : (details?.currency ?? 'USD');

  const save = async () => {
    setError('');
    if (!accountName.trim() || !accountNumber.trim() || !bankName.trim()) {
      setError('Account name, account number and bank name are required.');
      return;
    }
    setSaving(true);
    try {
      const res = await earnings.saveBankDetails({
        account_name: accountName.trim(),
        account_number: accountNumber.trim(),
        bank_name: bankName.trim(),
        branch: branch.trim() || undefined,
        swift_code: swift.trim() || undefined,
        country_code: (country ?? 'LK').toUpperCase(),
        currency,
      });
      // Drop the number from memory as soon as it has been registered.
      setAccountNumber('');
      setEditing(false);
      onSaved(res);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (details?.connected && !editing) {
    return (
      <div className="rounded-2xl border border-gray-200 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
              <i className="fa-solid fa-building-columns text-emerald-600"></i>
            </div>
            <div className="min-w-0">
              <p className="font-bold text-gray-900 text-sm truncate">
                {details.bank_name} {details.account_masked}
              </p>
              <p className="text-[13px] text-gray-500 truncate">
                {details.account_name}
                {details.currency && ` · paid in ${details.currency}`}
              </p>
            </div>
          </div>
          <button onClick={() => setEditing(true)}
            className="text-[13px] font-semibold text-cobalt hover:underline flex-shrink-0">
            Change
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 p-4 space-y-3">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
          <i className="fa-solid fa-building-columns text-cobalt"></i>
        </div>
        <div>
          <p className="font-bold text-gray-900 text-sm">Get paid to your bank</p>
          <p className="text-[13px] text-gray-500">
            Paid straight into your account{isLK && ' in LKR, usually within a business day'}.
          </p>
        </div>
      </div>

      <div className="space-y-2.5">
        <div>
          <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
            Account holder name
          </label>
          <input value={accountName} onChange={e => setAccountName(e.target.value)}
            placeholder="Exactly as it appears on your bank account" className={inp} />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
            Account number
          </label>
          <input value={accountNumber} onChange={e => setAccountNumber(e.target.value)}
            inputMode="numeric" autoComplete="off"
            placeholder={isLK ? '6–15 digits' : 'Your account number'} className={inp} />
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
              Bank
            </label>
            <input value={bankName} onChange={e => setBankName(e.target.value)}
              placeholder={isLK ? 'e.g. Sampath Bank' : 'Bank name'} className={inp} />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
              Branch
            </label>
            <input value={branch} onChange={e => setBranch(e.target.value)}
              placeholder="e.g. Colombo" className={inp} />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
            SWIFT / BIC <span className="text-gray-300 normal-case font-normal">(optional)</span>
          </label>
          <input value={swift} onChange={e => setSwift(e.target.value.toUpperCase())}
            placeholder="e.g. BSAMLKLX" className={inp} />
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5">
          <p className="text-[13px] text-rose-700">{error}</p>
        </div>
      )}

      <p className="text-[12px] text-gray-400 leading-relaxed">
        <i className="fa-solid fa-lock mr-1.5"></i>
        Your account number is sent straight to our payment provider and isn&apos;t stored by
        Spectrum — we keep only the last four digits so you can recognise the account.
      </p>

      <div className="flex gap-2">
        <button onClick={save} disabled={saving}
          className="flex-1 py-3 bg-cobalt text-white rounded-xl font-bold text-sm hover:bg-blue-700 active:scale-[0.99] transition disabled:opacity-50 flex items-center justify-center gap-2">
          {saving
            ? <><i className="fa-solid fa-spinner animate-spin"></i> Saving…</>
            : <><i className="fa-solid fa-check"></i> Save bank details</>}
        </button>
        {details?.connected && (
          <button onClick={() => { setEditing(false); setError(''); setAccountNumber(''); }}
            className="px-4 py-3 border border-gray-200 text-gray-600 rounded-xl font-semibold text-sm hover:bg-gray-50 transition">
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
