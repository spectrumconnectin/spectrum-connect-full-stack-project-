'use client';

import { formatMoney, MoneyValue } from '@/lib/api';
import { usePreferredCurrency } from '@/components/CurrencyProvider';

/**
 * One way to render money.
 *
 * Two rules it exists to enforce:
 *
 * 1. An amount is never shown without saying what currency it is. A bare
 *    "50,000" is how someone ends up thinking a project pays dollars when it
 *    pays rupees.
 * 2. The original amount is the truth. A conversion into the viewer's own
 *    currency is shown alongside it as an aid, marked approximate unless the
 *    rate was locked to the project — never in place of it.
 */

interface Props {
  amount?: number | null;
  /** The currency the amount is actually denominated in. */
  currency?: string | null;
  /** Show the ISO code next to the symbol. Default on, for unambiguous reading. */
  withCode?: boolean;
  /**
   * Convert into the viewer's preferred currency and show it underneath.
   * Only meaningful where the amount could belong to another currency.
   */
  showConversion?: boolean;
  /** A server-computed conversion, preferred over converting in the browser. */
  value?: MoneyValue | null;
  className?: string;
  /** Render the conversion inline rather than on its own line. */
  inline?: boolean;
}

export default function Money({
  amount,
  currency,
  withCode = true,
  showConversion = false,
  value,
  className = '',
  inline = false,
}: Props) {
  const { currency: preferred, convert } = usePreferredCurrency();

  // A server-supplied MoneyValue wins: it may carry a locked project rate,
  // which the browser has no way to know about.
  const baseAmount = value ? value.amount : amount ?? null;
  const baseCurrency = (value ? value.currency : currency) ?? 'USD';
  const primary = value?.formatted ?? formatMoney(baseAmount, baseCurrency, { withCode });

  const serverConversion = value?.converted ?? null;
  const localConversion =
    !serverConversion && showConversion && baseAmount !== null
      ? convert(baseAmount, baseCurrency)
      : null;

  const conversion = serverConversion ?? localConversion;
  const showIt = conversion && conversion.currency !== baseCurrency;

  if (!showIt) {
    return <span className={className}>{primary}</span>;
  }

  const note = conversion!.locked
    ? 'at this project’s locked rate'
    : 'based on current exchange rates';

  return (
    <span className={inline ? className : `inline-block ${className}`}>
      <span>{primary}</span>
      <span
        className={`text-gray-400 ${inline ? 'ml-1.5' : 'block text-xs mt-0.5'}`}
        title={
          conversion!.rate_age_stale
            ? 'Exchange rates could not be refreshed recently — treat this as a rough guide.'
            : note
        }
      >
        {conversion!.approximate ? '≈ ' : ''}
        {conversion!.formatted}
        {conversion!.rate_age_stale && ' *'}
      </span>
    </span>
  );
}
