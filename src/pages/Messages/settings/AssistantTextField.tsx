import { RotateCcw } from 'lucide-react';
import { useId, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { cx, FormInput, FormTextArea } from '../../../common/components/ui';
import { charCount, type AutoRepliesValues } from './settingsSchemas';

type TextName = 'assistantName' | 'handoffMessage' | 'outOfHoursMessage' | 'ackMessage';

interface Props {
  name: TextName;
  label: string;
  /** Lo que se usa con el campo vacío (el texto de siempre). */
  placeholder: string;
  max: number;
  /** Qué variables entiende, debajo del campo a la izquierda. */
  help: string;
  disabled: boolean;
  /** Una línea (el nombre) o un texto. */
  multiline?: boolean;
}

/**
 * Un texto del asistente: el campo con su ayuda de variables (a la izquierda, debajo), el contador de caracteres y
 * «Volver al texto de siempre», que lo vacía (al guardar va `null` y el back usa el de omisión).
 */
export const AssistantTextField = ({ name, label, placeholder, max, help, disabled, multiline = false }: Props) => {
  const id = useId();
  const { control, setValue, setFocus, getFieldState, formState } = useFormContext<AutoRepliesValues>();
  const [announcement, setAnnouncement] = useState('');
  const value = useWatch({ control, name }) ?? '';
  const error = getFieldState(name, formState).error?.message;
  const count = charCount(value.trim());
  const describedBy = [error ? `${id}-error` : null, `${id}-help`, `${id}-count`].filter(Boolean).join(' ');
  const common = { id, name, label, placeholder, disabled, 'aria-describedby': describedBy };

  return (
    <div className="grid gap-1">
      {/* Sin `maxLength` nativo: cuenta en UTF-16 (un emoji vale dos). El tope lo ponen el contador y zod, como el back. */}
      {multiline ? <FormTextArea {...common} rows={3} /> : <FormInput {...common} />}
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
        <p id={`${id}-help`} className="min-w-0 flex-1 text-left text-xs text-muted">
          {help}
        </p>
        <p
          id={`${id}-count`}
          className={cx('shrink-0 text-xs tabular-nums', count > max ? 'text-danger' : 'text-muted')}
        >
          {count}/{max}
        </p>
      </div>
      {value.trim() && !disabled && (
        <button
          type="button"
          onClick={() => {
            setValue(name, '', { shouldDirty: true, shouldValidate: true });
            setFocus(name);
            setAnnouncement('Se usará el texto de siempre');
          }}
          className="inline-flex w-fit items-center gap-1 rounded text-xs font-medium text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <RotateCcw aria-hidden="true" className="h-3 w-3" />
          Volver al texto de siempre
        </button>
      )}
      <p role="status" aria-live="polite" className="sr-only">
        {value.trim() ? '' : announcement}
      </p>
    </div>
  );
};
