import type { FormEvent, ReactNode } from 'react';
import { FormProvider, type FieldValues, type SubmitHandler, type UseFormReturn } from 'react-hook-form';

interface Props<T extends FieldValues> {
  methods: UseFormReturn<T>;
  onSubmit: SubmitHandler<T>;
  /** Id del `<form>`: el botón de envío del pie del Modal lo apunta con `form={id}`. */
  id?: string;
  className?: string;
  children: ReactNode;
}

/**
 * `<form>` conectado a react-hook-form: provee el contexto a los `Form*` de `FormFields`, que leen su valor y su error
 * por `name`. La validación la hace el resolver (zod), por eso va con `noValidate`.
 */
export const Form = <T extends FieldValues>({ methods, onSubmit, id, className, children }: Props<T>) => (
  <FormProvider {...methods}>
    <form
      id={id}
      className={className}
      noValidate
      onSubmit={(event: FormEvent<HTMLFormElement>) => void methods.handleSubmit(onSubmit)(event)}
    >
      {children}
    </form>
  </FormProvider>
);
