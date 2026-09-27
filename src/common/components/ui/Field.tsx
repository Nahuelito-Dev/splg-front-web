import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { cx } from './cx';

const CONTROL =
  'w-full rounded-[10px] border bg-surface px-3 text-[13px] text-ink shadow-control placeholder:text-faint transition-colors ' +
  'focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-tinta-50 disabled:text-muted';

const border = (error?: string) =>
  error
    ? 'border-danger focus:border-danger focus:ring-danger/30'
    : 'border-outline focus:border-primary focus:ring-primary/20';

interface FieldProps {
  label: string;
  error?: string;
  hint?: string;
}

const describedBy = (id: string, error?: string, hint?: string) =>
  error ? `${id}-error` : hint ? `${id}-hint` : undefined;

/** Envoltorio común: etiqueta asociada, ayuda y error anunciado a lectores de pantalla. */
const FieldShell = ({
  id,
  label,
  error,
  hint,
  required,
  children,
}: FieldProps & { id: string; required?: boolean; children: ReactNode }) => (
  <div className="flex flex-col gap-1.5">
    <label htmlFor={id} className="text-sm font-medium text-ink">
      {label}
      {required && (
        <span className="ml-0.5 text-danger" aria-hidden="true">
          *
        </span>
      )}
    </label>
    {children}
    {error ? (
      <p id={`${id}-error`} role="alert" className="text-xs text-danger">
        {error}
      </p>
    ) : (
      hint && (
        <p id={`${id}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      )
    )}
  </div>
);

type InputProps = FieldProps & InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(({ label, error, hint, className, id, ...rest }, ref) => {
  const generated = useId();
  const fieldId = id ?? generated;
  return (
    <FieldShell id={fieldId} label={label} error={error} hint={hint} required={rest.required}>
      <input
        ref={ref}
        id={fieldId}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={describedBy(fieldId, error, hint)}
        className={cx(CONTROL, 'h-10', border(error), className)}
        {...rest}
      />
    </FieldShell>
  );
});
Input.displayName = 'Input';

export interface SelectOption {
  value: string;
  label: string;
}

type SelectProps = FieldProps & SelectHTMLAttributes<HTMLSelectElement> & { options: SelectOption[] };

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, options, className, id, ...rest }, ref) => {
    const generated = useId();
    const fieldId = id ?? generated;
    return (
      <FieldShell id={fieldId} label={label} error={error} hint={hint} required={rest.required}>
        <select
          ref={ref}
          id={fieldId}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={describedBy(fieldId, error, hint)}
          className={cx(CONTROL, 'h-10', border(error), className)}
          {...rest}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </FieldShell>
    );
  },
);
Select.displayName = 'Select';

type TextAreaProps = FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>;

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, error, hint, className, id, ...rest }, ref) => {
    const generated = useId();
    const fieldId = id ?? generated;
    return (
      <FieldShell id={fieldId} label={label} error={error} hint={hint} required={rest.required}>
        <textarea
          ref={ref}
          id={fieldId}
          rows={3}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={describedBy(fieldId, error, hint)}
          className={cx(CONTROL, 'py-2', border(error), className)}
          {...rest}
        />
      </FieldShell>
    );
  },
);
TextArea.displayName = 'TextArea';

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { label: string; hint?: string };

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(({ label, hint, id, ...rest }, ref) => {
  const generated = useId();
  const fieldId = id ?? generated;
  return (
    <div className="flex items-start gap-3">
      <input
        ref={ref}
        id={fieldId}
        type="checkbox"
        className="mt-0.5 h-4 w-4 rounded border-outline accent-[theme(colors.primary.DEFAULT)] focus:ring-primary"
        {...rest}
      />
      <label htmlFor={fieldId} className="text-sm text-ink">
        {label}
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </label>
    </div>
  );
});
Checkbox.displayName = 'Checkbox';
