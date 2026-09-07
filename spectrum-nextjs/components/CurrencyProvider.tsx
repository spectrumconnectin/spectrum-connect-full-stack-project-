'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { currency as currencyApi, formatMoney, SupportedCurrency } from '@/lib/api';

/**
 * The viewer's currency, and enough rate data to convert for display.
 *
 * Rates are fetched once per session and held here so a page rendering fifty
 * amounts doesn't make fifty requests. Conversions done here are for display
 * only — anything that decides what someone is actually paid uses the rate the
 * server locked to the project, never this.
 */

interface Conversion {
  amount: number;
  currency: string;
  formatted: string;
  rate: number;
  locked: boolean;
  approximate: boolean;
  rate_age_stale: boolean;
  as_of: string | null;
}

interface CurrencyContextValue {
  /** The viewer's preferred currency code. */
  currency: string;
  currencies: SupportedCurrency[];
  ratesStale: boolean;
  loading: boolean;
  setCurrency: (code: string) => Promise<void>;
  /** Convert for display. Returns null when no rate is known. */
  convert: (amount: number, from: string) => Conversion | null;
}

const CurrencyContext = createContext<CurrencyContextValue>({
  currency: 'USD',
  currencies: [],
  ratesStale: false,
  loading: true,
  setCurrency: async () => {},
  convert: () => null,
});

export function usePreferredCurrency() {
  return useContext(CurrencyContext);
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [preferred, setPreferred] = useState('USD');
  const [currencies, setCurrencies] = useState<SupportedCurrency[]>([]);
  const [rates, setRates] = useState<Record<string, number>>({});
  const [ratesStale, setRatesStale] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // The currency list is public; the preference needs a session, so a
        // signed-out visitor still gets sensible formatting.
        const [list, mine] = await Promise.all([
          currencyApi.list().catch(() => null),
          currencyApi.mine().catch(() => null),
        ]);
        if (cancelled) return;
        if (list) {
          setCurrencies(list.currencies);
          setRatesStale(list.rates_stale);
        }
        if (mine) setPreferred(mine.currency);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Rates are pulled lazily, and only when the viewer reads a non-base
  // currency — most sessions never need them.
  useEffect(() => {
    if (preferred === 'USD' || rates[preferred]) return;
    let cancelled = false;
    currencyApi.convert(1, 'USD', preferred)
      .then(r => {
        if (cancelled || !r.converted) return;
        setRates(prev => ({ ...prev, [preferred]: r.converted!.rate }));
        setRatesStale(r.converted.rate_age_stale);
      })
      .catch(() => { /* leave unconverted rather than guess */ });
    return () => { cancelled = true; };
  }, [preferred, rates]);

  const setCurrency = useCallback(async (code: string) => {
    const previous = preferred;
    setPreferred(code);                 // optimistic — this is display only
    try {
      await currencyApi.setMine(code);
    } catch {
      setPreferred(previous);           // put it back if the server refused
    }
  }, [preferred]);

  const convert = useCallback((amount: number, from: string): Conversion | null => {
    const src = (from || 'USD').toUpperCase();
    if (src === preferred) return null;

    // Rates are quoted against USD, so anything else goes through it.
    const perUsdFrom = src === 'USD' ? 1 : rates[src];
    const perUsdTo = preferred === 'USD' ? 1 : rates[preferred];
    if (!perUsdFrom || !perUsdTo) return null;   // no rate: show nothing

    const rate = perUsdTo / perUsdFrom;
    const converted = amount * rate;
    return {
      amount: converted,
      currency: preferred,
      formatted: formatMoney(converted, preferred, { withCode: true }),
      rate,
      locked: false,
      approximate: true,
      rate_age_stale: ratesStale,
      as_of: null,
    };
  }, [preferred, rates, ratesStale]);

  return (
    <CurrencyContext.Provider
      value={{ currency: preferred, currencies, ratesStale, loading, setCurrency, convert }}>
      {children}
    </CurrencyContext.Provider>
  );
}
