import * as React from 'react';

const SYMBOLS: Record<string, string> = {
  USD: '$', EUR: '€', GBP: '£', LKR: 'Rs', INR: '₹',
  AUD: 'A$', CAD: 'C$', SGD: 'S$', AED: 'AED', JPY: '¥',
};

/** Currencies with no minor unit — rendering cents on these is wrong. */
const ZERO_DECIMAL = new Set(['JPY', 'KRW', 'VND', 'CLP', 'ISK', 'LKR']);

export function currencySymbol(code = 'USD'): string {
  return SYMBOLS[code.toUpperCase()] ?? code.toUpperCase();
}

export interface MoneyProps {
  amount: number;
  /** ISO 4217 code. Drives both the symbol and the decimal places. */
  currency?: string;
  /** Append the ISO code — use when one list mixes currencies. */
  showCode?: boolean;
  /** Suffix such as `/hr` or `/day`. */
  suffix?: string;
  className?: string;
}

/**
 * An amount of money.
 *
 * Decimal places follow the currency rather than a fixed 2 — LKR and JPY have
 * no minor unit, so cents there are meaningless. `showCode` exists because a
 * list that mixes currencies is legitimate: budgets are stored per project, and
 * a bare symbol leaves the reader guessing.
 */
export function Money({ amount, currency = 'USD', showCode, suffix, className = '' }: MoneyProps) {
  const code = currency.toUpperCase();
  const digits = ZERO_DECIMAL.has(code) ? 0 : 2;
  const body = amount.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  return (
    <span className={className}>
      {currencySymbol(code)}{body}{suffix}{showCode ? ` ${code}` : ''}
    </span>
  );
}
