import { zodResolver } from '@hookform/resolvers/zod';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { Form } from './Form';
import { FormCheckbox, FormInput, FormSelect, FormTextArea } from './FormFields';

afterEach(cleanup);

const schema = z.object({
  name: z.string().min(1, 'Escribí el nombre'),
  kind: z.string(),
  notes: z.string(),
  qty: z.number({ invalid_type_error: 'Poné un número' }),
  active: z.boolean(),
});
type Values = z.infer<typeof schema>;

const Harness = ({ onSubmit }: { onSubmit: (values: Values) => void }) => {
  const methods = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', kind: 'a', notes: '', qty: 1, active: false },
  });
  return (
    <Form methods={methods} onSubmit={onSubmit} id="demo">
      <FormInput name="name" label="Nombre" />
      <FormSelect
        name="kind"
        label="Tipo"
        options={[
          { value: 'a', label: 'A' },
          { value: 'b', label: 'B' },
        ]}
      />
      <FormTextArea name="notes" label="Notas" />
      <FormInput name="qty" label="Cantidad" type="number" registerOptions={{ valueAsNumber: true }} />
      <FormCheckbox name="active" label="Activo" />
      <button type="submit">Enviar</button>
    </Form>
  );
};

describe('Form + campos conectados', () => {
  it('pone id y noValidate al formulario', () => {
    const { container } = render(<Harness onSubmit={vi.fn()} />);
    const form = container.querySelector('form');
    expect(form).toHaveAttribute('id', 'demo');
    expect(form).toHaveAttribute('novalidate');
  });

  it('muestra el error del esquema bajo el campo sin pasarlo a mano', async () => {
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
    expect(await screen.findByText('Escribí el nombre')).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre')).toHaveAttribute('aria-invalid', 'true');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('entrega los valores de todos los campos al enviar', async () => {
    const onSubmit = vi.fn<[Values], void>();
    render(<Harness onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Ana' } });
    fireEvent.change(screen.getByLabelText('Tipo'), { target: { value: 'b' } });
    fireEvent.change(screen.getByLabelText('Notas'), { target: { value: 'hola' } });
    fireEvent.change(screen.getByLabelText('Cantidad'), { target: { value: '3' } });
    fireEvent.click(screen.getByLabelText('Activo'));
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0]?.[0]).toEqual({ name: 'Ana', kind: 'b', notes: 'hola', qty: 3, active: true });
  });
});
