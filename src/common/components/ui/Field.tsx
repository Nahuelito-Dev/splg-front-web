import { Check, ChevronDown } from 'lucide-react';
import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { cx } from './cx';
import { useInToolbar } from './toolbarContext';

const CONTROL =
  'w-full rounded-[10px] border bg-surface px-3 text-[13px] text-ink shadow-control placeholder:text-muted transition-colors ' +
  'focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-surface-hover disabled:text-muted';

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
  [error ? `${id}-error` : null, hint ? `${id}-hint` : null].filter(Boolean).join(' ') || undefined;

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
    {(error || hint) && (
      <div className="flex items-start justify-between gap-3">
        {error ? (
          <p id={`${id}-error`} role="alert" className="text-xs text-danger">
            {error}
          </p>
        ) : (
          <span />
        )}
        {hint && (
          <p id={`${id}-hint`} className="text-xs text-muted">
            {hint}
          </p>
        )}
      </div>
    )}
  </div>
);

type InputProps = FieldProps & InputHTMLAttributes<HTMLInputElement>;

/** El error de un control de la barra: visible debajo, sin etiqueta arriba que lo empuje. */
const ToolbarError = ({ id, error }: { id: string; error?: string }) =>
  error ? (
    <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-danger">
      {error}
    </p>
  ) : null;

/** La ayuda de un control de la barra: no se ve (no hay lugar), pero se lee y queda en el `title`. */
const ToolbarHint = ({ id, hint }: { id: string; hint?: string }) =>
  hint ? (
    <span id={`${id}-hint`} className="sr-only">
      {hint}
    </span>
  ) : null;

export const Input = forwardRef<HTMLInputElement, InputProps>(({ label, error, hint, className, id, ...rest }, ref) => {
  const generated = useId();
  const fieldId = id ?? generated;
  const inToolbar = useInToolbar();
  if (inToolbar)
    return (
      <div className="w-full md:w-auto md:min-w-[180px] md:max-w-[260px]" title={hint}>
        {/* La etiqueta queda a la vista como prefijo («ID del recurso:»), igual que en el select: al escribir no se
            pierde de qué es cada campo. */}
        <div
          className={cx(
            'flex h-10 w-full items-center gap-1.5 rounded-[10px] border bg-surface px-3 text-[13px] shadow-control transition-colors',
            'focus-within:ring-2 has-[:disabled]:cursor-not-allowed has-[:disabled]:bg-surface-hover',
            error
              ? 'border-danger focus-within:border-danger focus-within:ring-danger/30'
              : 'border-outline focus-within:border-primary focus-within:ring-primary/20',
          )}
        >
          <label htmlFor={fieldId} className="shrink-0 whitespace-nowrap text-muted">
            {label}:
          </label>
          <input
            ref={ref}
            id={fieldId}
            aria-label={label}
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={describedBy(fieldId, error, hint)}
            className={cx(
              'h-full min-w-0 flex-1 bg-transparent text-ink placeholder:text-muted focus:outline-none disabled:cursor-not-allowed disabled:text-muted',
              className,
            )}
            {...rest}
          />
        </div>
        <ToolbarError id={fieldId} error={error} />
        <ToolbarHint id={fieldId} hint={hint} />
      </div>
    );
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

/** La flecha propia del kit: el `<select>` va con `appearance-none` para no mostrar la del navegador. */
const SelectChevron = () => (
  <ChevronDown
    aria-hidden="true"
    className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
    strokeWidth={1.8}
  />
);

/** El texto de la opción con ese valor (o el de la primera, que es lo que muestra un `<select>` sin valor). */
const optionLabel = (options: SelectOption[], value: string | undefined) =>
  options.find((o) => o.value === value)?.label ?? options[0]?.label ?? '';

/**
 * Select de un filtro de `TableToolbar`: sin etiqueta visible arriba, con la etiqueta adentro («Vehículo: Todos los
 * vehículos») y en `aria-label`, 40 px de alto y entre 180 y 260 px de ancho. El error se ve debajo; la ayuda va como
 * descripción y en el `title`.
 *
 * El texto propio se dibuja encima del `<select>` (que lleva el suyo transparente). Funciona controlado (`value`) y no
 * controlado (`defaultValue`, `register` de react-hook-form): en ese caso lee la opción elegida del propio `<select>`
 * al montarse, al cambiar las opciones, en cada cambio y tras un `reset` del formulario. En contraste forzado (`forced-colors`) el
 * navegador pinta el texto del `<select>` igual: ahí se oculta el propio para que no se superpongan.
 */
const ToolbarSelect = forwardRef<HTMLSelectElement, SelectProps & { fieldId: string }>(
  ({ label, error, hint, options, className, fieldId, value, defaultValue, onChange, ...rest }, ref) => {
    const own = useRef<HTMLSelectElement | null>(null);
    const controlled = value !== undefined;
    const [domValue, setDomValue] = useState(() =>
      defaultValue === undefined ? undefined : String(defaultValue as string),
    );
    const setRefs = useCallback(
      (node: HTMLSelectElement | null) => {
        own.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      },
      [ref],
    );
    // Sin `value`, lo que vale es lo que tiene el `<select>`: `register` lo carga por la ref, sin un evento.
    useEffect(() => {
      if (controlled || !own.current) return;
      if (own.current.value !== domValue) setDomValue(own.current.value);
    }, [controlled, domValue, options]);
    useEffect(() => {
      const form = own.current?.form;
      if (controlled || !form) return undefined;
      const onReset = () => setTimeout(() => own.current && setDomValue(own.current.value));
      form.addEventListener('reset', onReset);
      return () => form.removeEventListener('reset', onReset);
    }, [controlled]);
    const selected = optionLabel(options, controlled ? String(value) : domValue);
    return (
      <div className={cx('w-full md:w-auto md:min-w-[180px] md:max-w-[260px]', className)} title={hint}>
        <div className="relative">
          <select
            ref={setRefs}
            id={fieldId}
            {...(controlled ? { value } : { defaultValue })}
            onChange={(event) => {
              if (!controlled) setDomValue(event.target.value);
              onChange?.(event);
            }}
            aria-label={label}
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={describedBy(fieldId, error, hint)}
            className={cx(
              CONTROL,
              'h-10 cursor-pointer appearance-none pr-9 text-transparent disabled:text-transparent [&>option]:bg-surface [&>option]:text-ink',
              border(error),
            )}
            {...rest}
          >
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <span
            aria-hidden="true"
            data-testid="toolbar-select-text"
            className={cx(
              'pointer-events-none absolute inset-y-0 left-3 right-9 flex items-center text-[13px] forced-colors:hidden',
              rest.disabled ? 'text-muted' : 'text-ink',
            )}
          >
            <span className="truncate">
              <span className="text-muted">{label}:</span> {selected}
            </span>
          </span>
          <SelectChevron />
        </div>
        <ToolbarError id={fieldId} error={error} />
        <ToolbarHint id={fieldId} hint={hint} />
      </div>
    );
  },
);
ToolbarSelect.displayName = 'ToolbarSelect';

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, options, className, id, ...rest }, ref) => {
    const generated = useId();
    const fieldId = id ?? generated;
    const inToolbar = useInToolbar();
    if (inToolbar)
      return (
        <ToolbarSelect
          ref={ref}
          fieldId={fieldId}
          label={label}
          error={error}
          hint={hint}
          options={options}
          className={className}
          {...rest}
        />
      );
    return (
      <FieldShell id={fieldId} label={label} error={error} hint={hint} required={rest.required}>
        <div className="relative">
          <select
            ref={ref}
            id={fieldId}
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={describedBy(fieldId, error, hint)}
            className={cx(CONTROL, 'h-10 appearance-none pr-9', border(error), className)}
            {...rest}
          >
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <SelectChevron />
        </div>
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

/**
 * Casilla. Dentro de `TableToolbar` se dibuja como un chip conmutable de 40 px (la casilla sigue ahí para el lector de
 * pantalla y el teclado, sin la apariencia del navegador).
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(({ label, hint, id, className, ...rest }, ref) => {
  const generated = useId();
  const fieldId = id ?? generated;
  const inToolbar = useInToolbar();
  if (inToolbar)
    return (
      <label
        htmlFor={fieldId}
        title={hint}
        className={cx(
          'group relative inline-flex h-10 shrink-0 cursor-pointer select-none items-center gap-2 whitespace-nowrap rounded-[10px] border border-outline bg-surface px-3 text-[13px] font-medium text-ink-2 shadow-control transition-colors hover:bg-surface-hover',
          'has-[:checked]:border-primary-edge has-[:checked]:bg-primary-soft has-[:checked]:text-on-primary-soft',
          'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/40 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60',
          className,
        )}
      >
        <input ref={ref} id={fieldId} type="checkbox" className="peer sr-only" {...rest} />
        <span
          aria-hidden="true"
          className="grid h-4 w-4 shrink-0 place-items-center rounded border border-outline bg-surface text-on-primary transition-colors peer-checked:border-primary peer-checked:bg-primary"
        >
          <Check className="hidden h-3 w-3 group-has-[:checked]:block" strokeWidth={3} />
        </span>
        {label}
      </label>
    );
  return (
    <div className="flex items-start gap-3">
      <input
        ref={ref}
        id={fieldId}
        type="checkbox"
        className={cx(
          'mt-0.5 h-4 w-4 rounded border-outline accent-[theme(colors.primary.DEFAULT)] focus:ring-primary',
          className,
        )}
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
