import { useFormContext, type RegisterOptions } from 'react-hook-form';
import { Checkbox, Input, Select, TextArea } from './Field';
import type { ComponentProps } from 'react';

/** Las opciones de `register` que algún campo necesita (`valueAsNumber`, `setValueAs`…). */
type Register = { registerOptions?: RegisterOptions };

/** Registra el campo `name` en el formulario del contexto y devuelve el mensaje de error de su validación. */
const useField = (name: string, options?: RegisterOptions) => {
  const { register, getFieldState, formState } = useFormContext();
  return { registered: register(name, options), error: getFieldState(name, formState).error?.message };
};

type InputProps = Omit<ComponentProps<typeof Input>, 'error' | 'name'> &
  Register & {
    name: string;
    /** Error que no sale del esquema (una regla contra datos del servidor); se muestra si el campo no tiene el suyo. */
    fallbackError?: string | null;
  };

/** `Input` conectado al formulario; también sirve para fechas (`type="date"`). */
export const FormInput = ({ name, registerOptions, fallbackError, ...rest }: InputProps) => {
  const { registered, error } = useField(name, registerOptions);
  return <Input {...rest} {...registered} error={error ?? fallbackError ?? undefined} />;
};

type SelectProps = Omit<ComponentProps<typeof Select>, 'error' | 'name'> & Register & { name: string };

/** `Select` conectado al formulario; su `onChange` (si lo hay) corre después de registrar el valor. */
export const FormSelect = ({ name, registerOptions, onChange, ...rest }: SelectProps) => {
  const { registered, error } = useField(name, registerOptions);
  return (
    <Select
      {...rest}
      {...registered}
      onChange={(event) => {
        void registered.onChange(event);
        onChange?.(event);
      }}
      error={error}
    />
  );
};

/** El mensaje de error del campo `name` para controles que no son un campo del kit (un selector de cliente, una lista). */
export const FormError = ({ name }: { name: string }) => {
  const { getFieldState, formState } = useFormContext();
  const message = getFieldState(name, formState).error?.message;
  return message ? (
    <p role="alert" className="text-xs text-danger">
      {message}
    </p>
  ) : null;
};

type TextAreaProps = Omit<ComponentProps<typeof TextArea>, 'error' | 'name'> & Register & { name: string };

export const FormTextArea = ({ name, registerOptions, ...rest }: TextAreaProps) => {
  const { registered, error } = useField(name, registerOptions);
  return <TextArea {...rest} {...registered} error={error} />;
};

type CheckboxProps = Omit<ComponentProps<typeof Checkbox>, 'name'> & Register & { name: string };

export const FormCheckbox = ({ name, registerOptions, ...rest }: CheckboxProps) => {
  const { registered } = useField(name, registerOptions);
  return <Checkbox {...rest} {...registered} />;
};
