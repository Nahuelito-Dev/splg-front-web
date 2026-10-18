import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Admin } from '../../../services/api/types';

const mutate = vi.hoisted(() => vi.fn());
vi.mock('../../../services/queries/admins', () => ({ useUpdateAdmin: () => ({ mutate, isPending: false }) }));

import { EditAdminModal } from './EditAdminModal';

afterEach(() => {
  cleanup();
  mutate.mockReset();
});

const admin = (phone: string | null) =>
  ({
    admin_id: 'a1',
    user: { full_name: 'Ana Pérez', phone_number: phone, email: 'ana@splg.com' },
  }) as unknown as Admin;

const open = (a: Admin) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <EditAdminModal admin={a} onClose={vi.fn()} />
    </QueryClientProvider>,
  );

describe('EditAdminModal', () => {
  it('un admin sin teléfono guarda sólo el nombre, sin mandar phoneNumber', async () => {
    open(admin(null));
    fireEvent.change(screen.getByLabelText(/Nombre completo/), { target: { value: 'Ana Pérez López' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
    expect(mutate).toHaveBeenCalledWith({ id: 'a1', body: { fullName: 'Ana Pérez López' } }, expect.anything());
  });

  it('un teléfono mal formado no se manda', async () => {
    open(admin('+5493764000000'));
    fireEvent.change(screen.getByLabelText(/Teléfono/), { target: { value: '123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect(await screen.findByText(/Formato internacional/)).toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();
  });
});
