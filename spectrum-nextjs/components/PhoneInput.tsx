'use client';

import { useState, useEffect } from 'react';

const COUNTRY_CODES = [
  { code: '+1', country: 'United States / Canada', label: '+1 (US/CA)' },
  { code: '+44', country: 'United Kingdom', label: '+44 (UK)' },
  { code: '+91', country: 'India', label: '+91 (IN)' },
  { code: '+86', country: 'China', label: '+86 (CN)' },
  { code: '+81', country: 'Japan', label: '+81 (JP)' },
  { code: '+49', country: 'Germany', label: '+49 (DE)' },
  { code: '+33', country: 'France', label: '+33 (FR)' },
  { code: '+39', country: 'Italy', label: '+39 (IT)' },
  { code: '+34', country: 'Spain', label: '+34 (ES)' },
  { code: '+61', country: 'Australia', label: '+61 (AU)' },
  { code: '+64', country: 'New Zealand', label: '+64 (NZ)' },
  { code: '+1', country: 'Mexico', label: '+52 (MX)' },
  { code: '+55', country: 'Brazil', label: '+55 (BR)' },
  { code: '+27', country: 'South Africa', label: '+27 (ZA)' },
  { code: '+971', country: 'United Arab Emirates', label: '+971 (AE)' },
  { code: '+65', country: 'Singapore', label: '+65 (SG)' },
  { code: '+60', country: 'Malaysia', label: '+60 (MY)' },
  { code: '+62', country: 'Indonesia', label: '+62 (ID)' },
  { code: '+66', country: 'Thailand', label: '+66 (TH)' },
  { code: '+82', country: 'South Korea', label: '+82 (KR)' },
  { code: '+90', country: 'Turkey', label: '+90 (TR)' },
  { code: '+52', country: 'Mexico', label: '+52 (MX)' },
  { code: '+46', country: 'Sweden', label: '+46 (SE)' },
  { code: '+47', country: 'Norway', label: '+47 (NO)' },
  { code: '+45', country: 'Denmark', label: '+45 (DK)' },
  { code: '+358', country: 'Finland', label: '+358 (FI)' },
  { code: '+31', country: 'Netherlands', label: '+31 (NL)' },
  { code: '+32', country: 'Belgium', label: '+32 (BE)' },
  { code: '+41', country: 'Switzerland', label: '+41 (CH)' },
  { code: '+43', country: 'Austria', label: '+43 (AT)' },
  { code: '+420', country: 'Czech Republic', label: '+420 (CZ)' },
  { code: '+48', country: 'Poland', label: '+48 (PL)' },
  { code: '+36', country: 'Hungary', label: '+36 (HU)' },
  { code: '+40', country: 'Romania', label: '+40 (RO)' },
  { code: '+359', country: 'Bulgaria', label: '+359 (BG)' },
  { code: '+30', country: 'Greece', label: '+30 (GR)' },
  { code: '+385', country: 'Croatia', label: '+385 (HR)' },
  { code: '+386', country: 'Slovenia', label: '+386 (SI)' },
  { code: '+421', country: 'Slovakia', label: '+421 (SK)' },
  { code: '+353', label: '+353 (IE)', country: 'Ireland' },
  { code: '+358', country: 'Finland', label: '+358 (FI)' },
].sort((a, b) => a.label.localeCompare(b.label));

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
  error?: string;
}

export default function PhoneInput({
  value,
  onChange,
  onBlur,
  placeholder = "2025551234",
  className = "",
  error,
}: PhoneInputProps) {
  const [countryCode, setCountryCode] = useState('+1');
  const [phone, setPhone] = useState('');

  // Extract country code and number from combined value
  useEffect(() => {
    const match = value.match(/^(\+\d{1,3})(.*)$/);
    if (match) {
      setCountryCode(match[1]);
      setPhone(match[2]);
    }
  }, [value]);

  const handlePhoneChange = (newPhone: string) => {
    // Remove non-digits
    const digitsOnly = newPhone.replace(/\D/g, '');
    setPhone(digitsOnly);
    onChange(`${countryCode}${digitsOnly}`);
  };

  const handleCountryCodeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCode = e.target.value;
    setCountryCode(newCode);
    onChange(`${newCode}${phone}`);
  };

  return (
    <div className="phone-input-group" style={{ display: 'flex', gap: 0 }}>
      <div style={{ flex: 1 }}>
        <select
          value={countryCode}
          onChange={handleCountryCodeChange}
          className={`phone-country-code ${error ? 'invalid' : ''}`}
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: '8px 0 0 8px',
            border: `1.5px solid ${error ? '#ef4444' : '#d1d5db'}`,
            backgroundColor: '#fff',
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
            color: '#111827',
            outline: 'none',
          }}
        >
          {COUNTRY_CODES.map(({ code, label }) => (
            <option key={`${code}-${label}`} value={code}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div style={{ flex: 3 }}>
        <input
          type="tel"
          inputMode="decimal"
          placeholder={placeholder}
          value={phone}
          onChange={(e) => handlePhoneChange(e.target.value)}
          onBlur={onBlur}
          className={`input phone-number-input ${className} ${error ? 'invalid' : ''}`}
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: '0 8px 8px 0',
            border: `1.5px solid ${error ? '#ef4444' : '#d1d5db'}`,
            fontSize: 14,
            fontWeight: 500,
            backgroundColor: '#fff',
            outline: 'none',
          }}
        />
      </div>
    </div>
  );
}
