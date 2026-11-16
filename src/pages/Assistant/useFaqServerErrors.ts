import { useCallback, useState } from 'react';
import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { faqServerErrors } from './faqRules';

/**
 * Pone cada error del back junto a su campo (`setError`) y devuelve el que es de la base entera (el tope, un 403) para
 * mostrarlo en el pie del formulario.
 */
export const useFaqServerErrors = <T extends FieldValues>(setError: UseFormSetError<T>, fields: Array<Path<T>>) => {
  const [formError, setFormError] = useState<string | null>(null);
  const apply = useCallback(
    (error: unknown) => {
      const general: string[] = [];
      let focused = false;
      for (const { field, message } of faqServerErrors(error)) {
        const target = fields.find((name) => name === field);
        if (target) {
          setError(target, { type: 'server', message }, { shouldFocus: !focused });
          focused = true;
        } else general.push(message);
      }
      setFormError(general.length > 0 ? general.join('. ') : null);
    },
    [fields, setError],
  );
  const clear = useCallback(() => setFormError(null), []);
  return { formError, apply, clear };
};
