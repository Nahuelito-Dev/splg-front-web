import { cx } from './cx';

interface Props {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Nombre accesible: qué es lo que se prende o apaga ("Zona Villa Lanús activa"). */
  label: string;
  disabled?: boolean;
  /** Por qué está deshabilitado (permisos), como `title` del control. */
  title?: string;
  /** Id de un texto que describe el estado (para el lector de pantalla), como `aria-describedby`. */
  describedBy?: string;
}

/** Interruptor accesible (`role="switch"`), para el activo/inactivo de una fila. */
export const Switch = ({ checked, onChange, label, disabled, title, describedBy }: Props) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    aria-describedby={describedBy}
    title={title}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={cx(
      'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
      'disabled:cursor-not-allowed disabled:opacity-50',
      checked ? 'border-primary-edge bg-primary' : 'border-outline bg-outline',
    )}
  >
    <span
      aria-hidden="true"
      className={cx(
        'inline-block h-4 w-4 transform rounded-full bg-surface shadow-control transition-transform',
        checked ? 'translate-x-6' : 'translate-x-1',
      )}
    />
  </button>
);
