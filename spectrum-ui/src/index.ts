/**
 * Spectrum Connect UI — the app's design language as importable components.
 *
 * Every component here is presentational: no data fetching, no router, no auth.
 * They carry the same class vocabulary the product ships, so a design built
 * from them maps onto code that can be pasted into the app.
 */
export { Button } from './Button';
export type { ButtonProps, ButtonVariant, ButtonSize } from './Button';

export { Card, SectionHeader } from './Card';
export type { CardProps, SectionHeaderProps } from './Card';

export { StatusPill } from './StatusPill';
export type { StatusPillProps, ProjectStatus } from './StatusPill';

export { Toggle, SettingRow } from './Toggle';
export type { ToggleProps, SettingRowProps } from './Toggle';

export { FilterRow, Chip } from './FilterRow';
export type { FilterRowProps, ChipProps } from './FilterRow';

export { Field, TextInput, TextArea } from './Field';
export type { FieldProps, TextInputProps, TextAreaProps } from './Field';

export { Stat, EmptyState, ProgressBar } from './Stat';
export type { StatProps, EmptyStateProps, ProgressBarProps } from './Stat';

export { Avatar, PresenceDot } from './Avatar';
export type { AvatarProps, PresenceDotProps } from './Avatar';

export { Money, currencySymbol } from './Money';
export type { MoneyProps } from './Money';
