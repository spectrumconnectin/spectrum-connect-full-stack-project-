import * as React from 'react';

export interface ToggleProps {
  /** Current state. This is a controlled component. */
  on: boolean;
  onToggle: () => void;
  /** Required: the switch has no visible text of its own. */
  label: string;
  disabled?: boolean;
}

/**
 * A settings switch.
 *
 * The track is deliberately 44x24 and carries `sc-fixed-size`, which opts it out
 * of the global mobile rule that forces every button to a 44px minimum height.
 * Without that opt-out the track becomes 44x44 and `rounded-full` renders it as
 * a circle. `sc-tap-target` restores the 44px touch area without changing the
 * shape.
 */
export function Toggle({ on, onToggle, label, disabled }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={onToggle}
      className={`relative w-11 h-6 shrink-0 rounded-full transition-colors sc-fixed-size sc-tap-target ${
        on ? 'bg-cobalt' : 'bg-gray-300'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
          on ? 'translate-x-5' : ''
        }`}
      />
    </button>
  );
}

export interface SettingRowProps {
  title: string;
  description?: string;
  on: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

/** A labelled settings row — title, optional description, switch on the right. */
export function SettingRow({ title, description, on, onToggle, disabled }: SettingRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
      <Toggle on={on} onToggle={onToggle} label={title} disabled={disabled} />
    </div>
  );
}
