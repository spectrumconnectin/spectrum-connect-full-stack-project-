import * as React from 'react';

export interface FieldProps {
  label: string;
  required?: boolean;
  /** Shown under the field in red; also marks the control as invalid. */
  error?: string;
  /** Shown under the field in grey when there is no error. */
  hint?: string;
  htmlFor?: string;
  children: React.ReactNode;
}

/** Label + control + one line of hint or error. */
export function Field({ label, required, error, hint, htmlFor, children }: FieldProps) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-gray-900 mb-1.5">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-red-600 mt-1">{error}</p>
      ) : hint ? (
        <p className="text-xs text-gray-400 mt-1">{hint}</p>
      ) : null}
    </div>
  );
}

const INPUT =
  'w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none ' +
  'focus:ring-2 focus:ring-cobalt focus:border-transparent text-gray-900 placeholder-gray-400 text-sm';

export interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

/**
 * The standard text input.
 *
 * 16px type is deliberate — anything smaller makes iOS Safari zoom the page on
 * focus, which reads as a layout bug. The `text-sm` class is overridden to 16px
 * at mobile widths by the kit stylesheet for exactly that reason.
 */
export function TextInput({ invalid, className = '', ...rest }: TextInputProps) {
  return <input {...rest} className={`${INPUT} ${invalid ? 'border-red-300' : ''} ${className}`} />;
}

export interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

/** The standard multi-line input. Resize is disabled to keep cards predictable. */
export function TextArea({ invalid, className = '', rows = 5, ...rest }: TextAreaProps) {
  return (
    <textarea
      {...rest}
      rows={rows}
      className={`${INPUT} resize-none ${invalid ? 'border-red-300' : ''} ${className}`}
    />
  );
}
