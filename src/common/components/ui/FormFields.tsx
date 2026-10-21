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

type InputProps = Omit<ComponentProps<typeof Input>, 'error' | 'name'> & Register & { name: string };

/** `Input` conectado al formulario; también sirve para fechas (`type="date"`). */
export const FormInput = ({ name, registerOptions, ...rest }: InputProps) => {
  const { registered, error } = useField(name, registerOptions);
  return <Input {...rest} {...registered} error={error} />;
};

type SelectProps = Omit<ComponentProps<typeof Select>, 'error' | 'name'> & Register & { name: string };

export const FormSelect = ({ name, registerOptions, ...rest }: SelectProps) => {
  const { registered, error } = useField(name, registerOptions);
  return <Select {...rest} {...registered} error={error} />;
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
