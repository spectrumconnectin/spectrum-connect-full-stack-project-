'use client';

import { useState, useEffect } from 'react';

const COUNTRY_CODES = [
  { code: '+1', country: 'Afghanistan', label: '+93 (AF)' },
  { code: '+93', country: 'Afghanistan', label: '+93 (AF)' },
  { code: '+358', country: 'Åland Islands', label: '+358 (AX)' },
  { code: '+355', country: 'Albania', label: '+355 (AL)' },
  { code: '+213', country: 'Algeria', label: '+213 (DZ)' },
  { code: '+1', country: 'American Samoa', label: '+1-684 (AS)' },
  { code: '+376', country: 'Andorra', label: '+376 (AD)' },
  { code: '+244', country: 'Angola', label: '+244 (AO)' },
  { code: '+1', country: 'Anguilla', label: '+1-264 (AI)' },
  { code: '+672', country: 'Antarctica', label: '+672 (AQ)' },
  { code: '+1', country: 'Antigua and Barbuda', label: '+1-268 (AG)' },
  { code: '+54', country: 'Argentina', label: '+54 (AR)' },
  { code: '+374', country: 'Armenia', label: '+374 (AM)' },
  { code: '+297', country: 'Aruba', label: '+297 (AW)' },
  { code: '+61', country: 'Australia', label: '+61 (AU)' },
  { code: '+43', country: 'Austria', label: '+43 (AT)' },
  { code: '+994', country: 'Azerbaijan', label: '+994 (AZ)' },
  { code: '+1', country: 'Bahamas', label: '+1-242 (BS)' },
  { code: '+973', country: 'Bahrain', label: '+973 (BH)' },
  { code: '+880', country: 'Bangladesh', label: '+880 (BD)' },
  { code: '+1', country: 'Barbados', label: '+1-246 (BB)' },
  { code: '+375', country: 'Belarus', label: '+375 (BY)' },
  { code: '+32', country: 'Belgium', label: '+32 (BE)' },
  { code: '+501', country: 'Belize', label: '+501 (BZ)' },
  { code: '+229', country: 'Benin', label: '+229 (BJ)' },
  { code: '+1', country: 'Bermuda', label: '+1-441 (BM)' },
  { code: '+975', country: 'Bhutan', label: '+975 (BT)' },
  { code: '+591', country: 'Bolivia', label: '+591 (BO)' },
  { code: '+387', country: 'Bosnia and Herzegovina', label: '+387 (BA)' },
  { code: '+267', country: 'Botswana', label: '+267 (BW)' },
  { code: '+55', country: 'Brazil', label: '+55 (BR)' },
  { code: '+246', country: 'British Indian Ocean Territory', label: '+246 (IO)' },
  { code: '+1', country: 'British Virgin Islands', label: '+1-284 (VG)' },
  { code: '+673', country: 'Brunei', label: '+673 (BN)' },
  { code: '+359', country: 'Bulgaria', label: '+359 (BG)' },
  { code: '+226', country: 'Burkina Faso', label: '+226 (BF)' },
  { code: '+257', country: 'Burundi', label: '+257 (BI)' },
  { code: '+855', country: 'Cambodia', label: '+855 (KH)' },
  { code: '+237', country: 'Cameroon', label: '+237 (CM)' },
  { code: '+1', country: 'Canada', label: '+1 (CA)' },
  { code: '+238', country: 'Cape Verde', label: '+238 (CV)' },
  { code: '+1', country: 'Caribbean Netherlands', label: '+1-721 (BQ)' },
  { code: '+1', country: 'Cayman Islands', label: '+1-345 (KY)' },
  { code: '+236', country: 'Central African Republic', label: '+236 (CF)' },
  { code: '+235', country: 'Chad', label: '+235 (TD)' },
  { code: '+56', country: 'Chile', label: '+56 (CL)' },
  { code: '+86', country: 'China', label: '+86 (CN)' },
  { code: '+886', country: 'Taiwan', label: '+886 (TW)' },
  { code: '+57', country: 'Colombia', label: '+57 (CO)' },
  { code: '+269', country: 'Comoros', label: '+269 (KM)' },
  { code: '+242', country: 'Congo', label: '+242 (CG)' },
  { code: '+243', country: 'Democratic Republic of the Congo', label: '+243 (CD)' },
  { code: '+506', country: 'Costa Rica', label: '+506 (CR)' },
  { code: '+385', country: 'Croatia', label: '+385 (HR)' },
  { code: '+53', country: 'Cuba', label: '+53 (CU)' },
  { code: '+599', country: 'Curaçao', label: '+599 (CW)' },
  { code: '+357', country: 'Cyprus', label: '+357 (CY)' },
  { code: '+420', country: 'Czech Republic', label: '+420 (CZ)' },
  { code: '+45', country: 'Denmark', label: '+45 (DK)' },
  { code: '+253', country: 'Djibouti', label: '+253 (DJ)' },
  { code: '+1', country: 'Dominica', label: '+1-767 (DM)' },
  { code: '+1', country: 'Dominican Republic', label: '+1-809 (DO)' },
  { code: '+670', country: 'East Timor', label: '+670 (TL)' },
  { code: '+593', country: 'Ecuador', label: '+593 (EC)' },
  { code: '+20', country: 'Egypt', label: '+20 (EG)' },
  { code: '+503', country: 'El Salvador', label: '+503 (SV)' },
  { code: '+240', country: 'Equatorial Guinea', label: '+240 (GQ)' },
  { code: '+291', country: 'Eritrea', label: '+291 (ER)' },
  { code: '+372', country: 'Estonia', label: '+372 (EE)' },
  { code: '+251', country: 'Ethiopia', label: '+251 (ET)' },
  { code: '+500', country: 'Falkland Islands', label: '+500 (FK)' },
  { code: '+298', country: 'Faroe Islands', label: '+298 (FO)' },
  { code: '+679', country: 'Fiji', label: '+679 (FJ)' },
  { code: '+358', country: 'Finland', label: '+358 (FI)' },
  { code: '+33', country: 'France', label: '+33 (FR)' },
  { code: '+594', country: 'French Guiana', label: '+594 (GF)' },
  { code: '+689', country: 'French Polynesia', label: '+689 (PF)' },
  { code: '+241', country: 'Gabon', label: '+241 (GA)' },
  { code: '+220', country: 'Gambia', label: '+220 (GM)' },
  { code: '+995', country: 'Georgia', label: '+995 (GE)' },
  { code: '+49', country: 'Germany', label: '+49 (DE)' },
  { code: '+233', country: 'Ghana', label: '+233 (GH)' },
  { code: '+350', country: 'Gibraltar', label: '+350 (GI)' },
  { code: '+30', country: 'Greece', label: '+30 (GR)' },
  { code: '+299', country: 'Greenland', label: '+299 (GL)' },
  { code: '+1', country: 'Grenada', label: '+1-473 (GD)' },
  { code: '+590', country: 'Guadeloupe', label: '+590 (GP)' },
  { code: '+1', country: 'Guam', label: '+1-671 (GU)' },
  { code: '+502', country: 'Guatemala', label: '+502 (GT)' },
  { code: '+441481', country: 'Guernsey', label: '+441481 (GG)' },
  { code: '+224', country: 'Guinea', label: '+224 (GN)' },
  { code: '+245', country: 'Guinea-Bissau', label: '+245 (GW)' },
  { code: '+592', country: 'Guyana', label: '+592 (GY)' },
  { code: '+509', country: 'Haiti', label: '+509 (HT)' },
  { code: '+504', country: 'Honduras', label: '+504 (HN)' },
  { code: '+852', country: 'Hong Kong', label: '+852 (HK)' },
  { code: '+36', country: 'Hungary', label: '+36 (HU)' },
  { code: '+354', country: 'Iceland', label: '+354 (IS)' },
  { code: '+91', country: 'India', label: '+91 (IN)' },
  { code: '+62', country: 'Indonesia', label: '+62 (ID)' },
  { code: '+98', country: 'Iran', label: '+98 (IR)' },
  { code: '+964', country: 'Iraq', label: '+964 (IQ)' },
  { code: '+353', country: 'Ireland', label: '+353 (IE)' },
  { code: '+441624', country: 'Isle of Man', label: '+441624 (IM)' },
  { code: '+972', country: 'Israel', label: '+972 (IL)' },
  { code: '+39', country: 'Italy', label: '+39 (IT)' },
  { code: '+1', country: 'Ivory Coast', label: '+225 (CI)' },
  { code: '+225', country: 'Ivory Coast', label: '+225 (CI)' },
  { code: '+1', country: 'Jamaica', label: '+1-876 (JM)' },
  { code: '+81', country: 'Japan', label: '+81 (JP)' },
  { code: '+441534', country: 'Jersey', label: '+441534 (JE)' },
  { code: '+962', country: 'Jordan', label: '+962 (JO)' },
  { code: '+7', country: 'Kazakhstan', label: '+7 (KZ)' },
  { code: '+254', country: 'Kenya', label: '+254 (KE)' },
  { code: '+686', country: 'Kiribati', label: '+686 (KI)' },
  { code: '+850', country: 'North Korea', label: '+850 (KP)' },
  { code: '+82', country: 'South Korea', label: '+82 (KR)' },
  { code: '+965', country: 'Kuwait', label: '+965 (KW)' },
  { code: '+996', country: 'Kyrgyzstan', label: '+996 (KG)' },
  { code: '+856', country: 'Laos', label: '+856 (LA)' },
  { code: '+371', country: 'Latvia', label: '+371 (LV)' },
  { code: '+961', country: 'Lebanon', label: '+961 (LB)' },
  { code: '+266', country: 'Lesotho', label: '+266 (LS)' },
  { code: '+231', country: 'Liberia', label: '+231 (LR)' },
  { code: '+218', country: 'Libya', label: '+218 (LY)' },
  { code: '+423', country: 'Liechtenstein', label: '+423 (LI)' },
  { code: '+370', country: 'Lithuania', label: '+370 (LT)' },
  { code: '+352', country: 'Luxembourg', label: '+352 (LU)' },
  { code: '+853', country: 'Macau', label: '+853 (MO)' },
  { code: '+389', country: 'North Macedonia', label: '+389 (MK)' },
  { code: '+261', country: 'Madagascar', label: '+261 (MG)' },
  { code: '+265', country: 'Malawi', label: '+265 (MW)' },
  { code: '+60', country: 'Malaysia', label: '+60 (MY)' },
  { code: '+960', country: 'Maldives', label: '+960 (MV)' },
  { code: '+223', country: 'Mali', label: '+223 (ML)' },
  { code: '+356', country: 'Malta', label: '+356 (MT)' },
  { code: '+1', country: 'Marshall Islands', label: '+1-692 (MH)' },
  { code: '+596', country: 'Martinique', label: '+596 (MQ)' },
  { code: '+222', country: 'Mauritania', label: '+222 (MR)' },
  { code: '+230', country: 'Mauritius', label: '+230 (MU)' },
  { code: '+262', country: 'Mayotte', label: '+262 (YT)' },
  { code: '+52', country: 'Mexico', label: '+52 (MX)' },
  { code: '+691', country: 'Micronesia', label: '+691 (FM)' },
  { code: '+373', country: 'Moldova', label: '+373 (MD)' },
  { code: '+377', country: 'Monaco', label: '+377 (MC)' },
  { code: '+976', country: 'Mongolia', label: '+976 (MN)' },
  { code: '+382', country: 'Montenegro', label: '+382 (ME)' },
  { code: '+1', country: 'Montserrat', label: '+1-664 (MS)' },
  { code: '+212', country: 'Morocco', label: '+212 (MA)' },
  { code: '+258', country: 'Mozambique', label: '+258 (MZ)' },
  { code: '+95', country: 'Myanmar', label: '+95 (MM)' },
  { code: '+264', country: 'Namibia', label: '+264 (NA)' },
  { code: '+674', country: 'Nauru', label: '+674 (NR)' },
  { code: '+977', country: 'Nepal', label: '+977 (NP)' },
  { code: '+31', country: 'Netherlands', label: '+31 (NL)' },
  { code: '+64', country: 'New Zealand', label: '+64 (NZ)' },
  { code: '+505', country: 'Nicaragua', label: '+505 (NI)' },
  { code: '+227', country: 'Niger', label: '+227 (NE)' },
  { code: '+234', country: 'Nigeria', label: '+234 (NG)' },
  { code: '+683', country: 'Niue', label: '+683 (NU)' },
  { code: '+672', country: 'Norfolk Island', label: '+672 (NF)' },
  { code: '+1', country: 'Northern Mariana Islands', label: '+1-670 (MP)' },
  { code: '+47', country: 'Norway', label: '+47 (NO)' },
  { code: '+968', country: 'Oman', label: '+968 (OM)' },
  { code: '+92', country: 'Pakistan', label: '+92 (PK)' },
  { code: '+680', country: 'Palau', label: '+680 (PW)' },
  { code: '+970', country: 'Palestine', label: '+970 (PS)' },
  { code: '+507', country: 'Panama', label: '+507 (PA)' },
  { code: '+675', country: 'Papua New Guinea', label: '+675 (PG)' },
  { code: '+595', country: 'Paraguay', label: '+595 (PY)' },
  { code: '+51', country: 'Peru', label: '+51 (PE)' },
  { code: '+63', country: 'Philippines', label: '+63 (PH)' },
  { code: '+64', country: 'Pitcairn Islands', label: '+64 (PN)' },
  { code: '+48', country: 'Poland', label: '+48 (PL)' },
  { code: '+351', country: 'Portugal', label: '+351 (PT)' },
  { code: '+1', country: 'Puerto Rico', label: '+1-787 (PR)' },
  { code: '+974', country: 'Qatar', label: '+974 (QA)' },
  { code: '+40', country: 'Romania', label: '+40 (RO)' },
  { code: '+7', country: 'Russia', label: '+7 (RU)' },
  { code: '+250', country: 'Rwanda', label: '+250 (RW)' },
  { code: '+1', country: 'Saint Barthélemy', label: '+590 (BL)' },
  { code: '+590', country: 'Saint Barthélemy', label: '+590 (BL)' },
  { code: '+1', country: 'Saint Kitts and Nevis', label: '+1-869 (KN)' },
  { code: '+1', country: 'Saint Lucia', label: '+1-758 (LC)' },
  { code: '+590', country: 'Saint Martin', label: '+590 (MF)' },
  { code: '+508', country: 'Saint Pierre and Miquelon', label: '+508 (PM)' },
  { code: '+1', country: 'Saint Vincent and the Grenadines', label: '+1-784 (VC)' },
  { code: '+685', country: 'Samoa', label: '+685 (WS)' },
  { code: '+378', country: 'San Marino', label: '+378 (SM)' },
  { code: '+239', country: 'São Tomé and Príncipe', label: '+239 (ST)' },
  { code: '+966', country: 'Saudi Arabia', label: '+966 (SA)' },
  { code: '+221', country: 'Senegal', label: '+221 (SN)' },
  { code: '+381', country: 'Serbia', label: '+381 (RS)' },
  { code: '+248', country: 'Seychelles', label: '+248 (SC)' },
  { code: '+232', country: 'Sierra Leone', label: '+232 (SL)' },
  { code: '+65', country: 'Singapore', label: '+65 (SG)' },
  { code: '+1', country: 'Sint Maarten', label: '+1-721 (SX)' },
  { code: '+421', country: 'Slovakia', label: '+421 (SK)' },
  { code: '+386', country: 'Slovenia', label: '+386 (SI)' },
  { code: '+677', country: 'Solomon Islands', label: '+677 (SB)' },
  { code: '+252', country: 'Somalia', label: '+252 (SO)' },
  { code: '+27', country: 'South Africa', label: '+27 (ZA)' },
  { code: '+211', country: 'South Sudan', label: '+211 (SS)' },
  { code: '+34', country: 'Spain', label: '+34 (ES)' },
  { code: '+94', country: 'Sri Lanka', label: '+94 (LK)' },
  { code: '+249', country: 'Sudan', label: '+249 (SD)' },
  { code: '+597', country: 'Suriname', label: '+597 (SR)' },
  { code: '+47', country: 'Svalbard and Jan Mayen', label: '+47 (SJ)' },
  { code: '+268', country: 'Eswatini', label: '+268 (SZ)' },
  { code: '+46', country: 'Sweden', label: '+46 (SE)' },
  { code: '+41', country: 'Switzerland', label: '+41 (CH)' },
  { code: '+963', country: 'Syria', label: '+963 (SY)' },
  { code: '+886', country: 'Taiwan', label: '+886 (TW)' },
  { code: '+992', country: 'Tajikistan', label: '+992 (TJ)' },
  { code: '+255', country: 'Tanzania', label: '+255 (TZ)' },
  { code: '+66', country: 'Thailand', label: '+66 (TH)' },
  { code: '+670', country: 'Timor-Leste', label: '+670 (TL)' },
  { code: '+228', country: 'Togo', label: '+228 (TG)' },
  { code: '+676', country: 'Tonga', label: '+676 (TO)' },
  { code: '+1', country: 'Trinidad and Tobago', label: '+1-868 (TT)' },
  { code: '+216', country: 'Tunisia', label: '+216 (TN)' },
  { code: '+90', country: 'Turkey', label: '+90 (TR)' },
  { code: '+993', country: 'Turkmenistan', label: '+993 (TM)' },
  { code: '+1', country: 'Turks and Caicos Islands', label: '+1-649 (TC)' },
  { code: '+688', country: 'Tuvalu', label: '+688 (TV)' },
  { code: '+256', country: 'Uganda', label: '+256 (UG)' },
  { code: '+380', country: 'Ukraine', label: '+380 (UA)' },
  { code: '+971', country: 'United Arab Emirates', label: '+971 (AE)' },
  { code: '+44', country: 'United Kingdom', label: '+44 (UK)' },
  { code: '+1', country: 'United States', label: '+1 (US)' },
  { code: '+598', country: 'Uruguay', label: '+598 (UY)' },
  { code: '+998', country: 'Uzbekistan', label: '+998 (UZ)' },
  { code: '+678', country: 'Vanuatu', label: '+678 (VU)' },
  { code: '+39', country: 'Vatican City', label: '+39 (VA)' },
  { code: '+58', country: 'Venezuela', label: '+58 (VE)' },
  { code: '+84', country: 'Vietnam', label: '+84 (VN)' },
  { code: '+1', country: 'Virgin Islands (US)', label: '+1-340 (VI)' },
  { code: '+681', country: 'Wallis and Futuna', label: '+681 (WF)' },
  { code: '+212', country: 'Western Sahara', label: '+212 (EH)' },
  { code: '+967', country: 'Yemen', label: '+967 (YE)' },
  { code: '+260', country: 'Zambia', label: '+260 (ZM)' },
  { code: '+263', country: 'Zimbabwe', label: '+263 (ZW)' },
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
