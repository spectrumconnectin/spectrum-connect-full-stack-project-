'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

const plans = {
  pro: {
    name: 'Pro Plan',
    price: 15,
    unit: '/month',
    badge: 'Most Popular',
    badgeColor: 'bg-violet-100 text-violet-700',
    gradient: 'from-violet-500 to-purple-600',
    icon: 'fa-crown',
    features: ['Unlimited outreach to clients', 'Advanced matching preferences', 'Enhanced team building tools', 'Priority support', 'Profile boost (1×/month included)', 'Early access to new features'],
    recurring: true,
  },
  boost: {
    name: 'Profile Boost',
    price: 8,
    unit: '/boost',
    badge: 'One-time',
    badgeColor: 'bg-orange-100 text-orange-700',
    gradient: 'from-orange-500 to-red-500',
    icon: 'fa-rocket',
    features: ['Highlighted profile for 7 days', 'Appear in featured sections', 'Increased visibility in search', 'No commitment required', 'Results visible within 24 hours'],
    recurring: false,
  },
  verify: {
    name: 'Verification Badge',
    price: 20,
    unit: 'one-time',
    badge: 'Lifetime',
    badgeColor: 'bg-green-100 text-green-700',
    gradient: 'from-emerald-500 to-green-600',
    icon: 'fa-shield-check',
    features: ['Official verified badge on profile', 'Higher trust from clients', 'Improved match priority', 'Lifetime verification', 'ID review by Spectrum team'],
    recurring: false,
  },
};

type PlanKey = keyof typeof plans;

export default function UpgradePage() {
  const searchParams = useSearchParams();
  const initialPlan = (searchParams.get('plan') as PlanKey) || 'pro';
  const [selectedPlan, setSelectedPlan] = useState<PlanKey>(initialPlan);
  const [step, setStep] = useState<'select' | 'payment' | 'done'>('select');
  const [cardNum, setCardNum] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [name, setName] = useState('');
  const [processing, setProcessing] = useState(false);

  const plan = plans[selectedPlan];

  const formatCard = (v: string) => v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
  const formatExpiry = (v: string) => { const d = v.replace(/\D/g, '').slice(0, 4); return d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d; };

  const canPay = cardNum.replace(/\s/g, '').length === 16 && expiry.length === 5 && cvv.length >= 3 && name.trim().length > 2;

  const handlePay = async () => {
    if (!canPay) return;
    setProcessing(true);
    // TODO: POST /billing/checkout { plan: selectedPlan, payment_method: { card_number, expiry, cvv, name } }
    await new Promise(r => setTimeout(r, 1800));
    setProcessing(false);
    setStep('done');
  };

  if (step === 'done') {
    return (
      <div className="max-w-md mx-auto py-20 text-center">
        <div className={`w-20 h-20 bg-gradient-to-br ${plan.gradient} rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg`}>
          <i className={`fa-solid ${plan.icon} text-white text-3xl`}></i>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">You're all set!</h1>
        <p className="text-gray-500 mb-2"><strong>{plan.name}</strong> is now active on your account.</p>
        {plan.recurring && <p className="text-gray-400 text-sm mb-8">You'll be billed ${plan.price}/month. Cancel any time from Settings.</p>}
        {!plan.recurring && <p className="text-gray-400 text-sm mb-8">This is a one-time payment of ${plan.price}. No future charges.</p>}
        <div className="flex gap-3 justify-center">
          <Link href="/creator/dashboard" className="px-6 py-3 bg-cobalt text-white rounded-xl font-semibold hover:bg-blue-700 transition">
            Go to Dashboard
          </Link>
          <Link href="/creator/profile" className="px-6 py-3 border border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition">
            View Profile
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <Link href="/creator/dashboard" className="text-sm text-gray-500 hover:text-cobalt transition flex items-center gap-1.5 mb-4">
          <i className="fa-solid fa-arrow-left text-xs"></i> Back
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mb-1">Upgrade Your Account</h1>
        <p className="text-gray-500">Choose the upgrade that fits your needs. Cancel anytime.</p>
      </div>

      <div className="grid lg:grid-cols-5 gap-8">
        {/* Left: plan picker + summary */}
        <div className="lg:col-span-3 space-y-4">

          {/* Step indicator */}
          <div className="flex items-center gap-3 mb-6">
            {['select', 'payment'].map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition ${step === s || (step === 'payment' && i === 0) ? 'bg-cobalt text-white' : 'bg-gray-100 text-gray-400'}`}>
                  {step === 'payment' && i === 0 ? <i className="fa-solid fa-check text-xs"></i> : i + 1}
                </div>
                <span className={`text-sm font-medium ${step === s ? 'text-gray-900' : 'text-gray-400'}`}>{i === 0 ? 'Choose Plan' : 'Payment'}</span>
                {i === 0 && <i className="fa-solid fa-chevron-right text-gray-300 text-xs ml-1"></i>}
              </div>
            ))}
          </div>

          {step === 'select' && (
            <>
              <h2 className="text-lg font-bold text-gray-900 mb-3">Select a plan</h2>
              {(Object.entries(plans) as [PlanKey, typeof plans[PlanKey]][]).map(([key, p]) => (
                <button key={key} onClick={() => setSelectedPlan(key)}
                  className={`w-full text-left p-5 rounded-2xl border-2 transition-all ${selectedPlan === key ? 'border-cobalt bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${p.gradient} flex items-center justify-center shadow-sm flex-shrink-0`}>
                      <i className={`fa-solid ${p.icon} text-white`}></i>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-bold text-gray-900">{p.name}</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${p.badgeColor}`}>{p.badge}</span>
                      </div>
                      <p className="text-xs text-gray-500">{p.features[0]}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="text-xl font-bold text-gray-900">${p.price}</span>
                      <span className="text-xs text-gray-400 ml-1">{p.unit}</span>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition ${selectedPlan === key ? 'border-cobalt bg-cobalt' : 'border-gray-300'}`}>
                      {selectedPlan === key && <div className="w-2 h-2 bg-white rounded-full"></div>}
                    </div>
                  </div>
                </button>
              ))}

              <button onClick={() => setStep('payment')}
                className="w-full mt-2 py-3.5 bg-cobalt text-white rounded-xl font-semibold hover:bg-blue-700 transition shadow-sm">
                Continue to Payment <i className="fa-solid fa-arrow-right ml-2"></i>
              </button>
            </>
          )}

          {step === 'payment' && (
            <>
              <button onClick={() => setStep('select')} className="text-sm text-gray-500 hover:text-cobalt flex items-center gap-1 mb-4">
                <i className="fa-solid fa-arrow-left text-xs"></i> Change plan
              </button>
              <h2 className="text-lg font-bold text-gray-900 mb-4">Payment Details</h2>
              <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4 shadow-sm">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Cardholder Name</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)}
                    placeholder="Alex Johnson"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-cobalt focus:ring-2 focus:ring-blue-100" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Card Number</label>
                  <div className="relative">
                    <input type="text" value={cardNum} onChange={e => setCardNum(formatCard(e.target.value))}
                      placeholder="1234 5678 9012 3456" maxLength={19}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-cobalt focus:ring-2 focus:ring-blue-100 pr-12" />
                    <i className="fa-brands fa-cc-visa absolute right-4 top-1/2 -translate-y-1/2 text-xl text-gray-400"></i>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Expiry Date</label>
                    <input type="text" value={expiry} onChange={e => setExpiry(formatExpiry(e.target.value))}
                      placeholder="MM/YY" maxLength={5}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-cobalt focus:ring-2 focus:ring-blue-100" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">CVV</label>
                    <input type="password" value={cvv} onChange={e => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="•••"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-cobalt focus:ring-2 focus:ring-blue-100" />
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400 pt-1">
                  <i className="fa-solid fa-lock text-gray-300"></i>
                  Payments are secured with 256-bit SSL encryption
                </div>
              </div>

              <button onClick={handlePay} disabled={!canPay || processing}
                className={`w-full py-3.5 rounded-xl font-semibold transition flex items-center justify-center gap-2 shadow-sm ${canPay && !processing ? 'bg-cobalt text-white hover:bg-blue-700' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>
                {processing
                  ? <><i className="fa-solid fa-spinner animate-spin"></i> Processing…</>
                  : <><i className="fa-solid fa-lock"></i> Pay ${plan.price} {plan.recurring ? '/ month' : 'once'}</>}
              </button>
            </>
          )}
        </div>

        {/* Right: order summary */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm sticky top-24">
            <h3 className="text-base font-bold text-gray-900 mb-4">Order Summary</h3>
            <div className={`bg-gradient-to-br ${plan.gradient} rounded-xl p-4 text-white mb-4`}>
              <div className="flex items-center gap-3 mb-3">
                <i className={`fa-solid ${plan.icon} text-2xl`}></i>
                <div>
                  <p className="font-bold">{plan.name}</p>
                  <p className="text-white/70 text-xs">{plan.badge}</p>
                </div>
              </div>
              <div className="text-2xl font-bold">${plan.price}<span className="text-sm font-normal text-white/70 ml-1">{plan.unit}</span></div>
            </div>
            <ul className="space-y-2.5 mb-5">
              {plan.features.map(f => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-gray-600">
                  <i className="fa-solid fa-circle-check text-green-500 mt-0.5 flex-shrink-0 text-xs"></i>
                  {f}
                </li>
              ))}
            </ul>
            <div className="border-t border-gray-100 pt-4 space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>{plan.name}</span>
                <span>${plan.price}</span>
              </div>
              <div className="flex justify-between text-gray-400 text-xs">
                <span>Platform fee</span>
                <span>$0</span>
              </div>
              <div className="flex justify-between font-bold text-gray-900 pt-1 border-t border-gray-100">
                <span>Total {plan.recurring ? '/ month' : 'today'}</span>
                <span>${plan.price}</span>
              </div>
            </div>
            {plan.recurring && (
              <p className="text-xs text-gray-400 mt-3 text-center">Cancel anytime from Settings. No penalty.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
