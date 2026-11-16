import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../../services/api/errors';

const mutateAsync = vi.fn();
vi.mock('../../../services/queries/users', () => ({
  useFindUserByPhone: () => ({ mutateAsync: (...args: unknown[]): unknown => mutateAsync(...args), isPending: false }),
}));

import { FindUserByPhoneModal } from './FindUserByPhoneModal';

const search = (value: string) => {
  fireEvent.change(screen.getByLabelText(/Teléfono/), { target: { value } });
  fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));
};

describe('FindUserByPhoneModal', () => {
  beforeEach(() => {
    mutateAsync.mockReset();
  });
  afterEach(cleanup);

  it('no dispara la búsqueda con un teléfono vacío o mal formado', async () => {
    render(<FindUserByPhoneModal open onClose={vi.fn()} onFound={vi.fn()} />);
    search('376 4000000');
    expect(await screen.findByText(/Formato internacional/, { selector: '[role="alert"]' })).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('normaliza el teléfono a E.164 antes de buscar y navega al encontrarlo', async () => {
    const user = { user_id: 'u-1' };
    mutateAsync.mockResolvedValue(user);
    const onFound = vi.fn();
    render(<FindUserByPhoneModal open onClose={vi.fn()} onFound={onFound} />);
    search('+54 9 (376) 400-0000');
    await waitFor(() => expect(onFound).toHaveBeenCalledWith(user));
    expect(mutateAsync).toHaveBeenCalledWith('+5493764000000');
  });

  it('distingue "no existe" de un error del servidor', async () => {
    mutateAsync.mockResolvedValueOnce(null);
    render(<FindUserByPhoneModal open onClose={vi.fn()} onFound={vi.fn()} />);
    search('+5493764000000');
    expect(await screen.findByText('Ningún usuario tiene ese teléfono')).toBeInTheDocument();

    mutateAsync.mockRejectedValueOnce(new ApiError(500, ['boom']));
    search('+5493764000001');
    expect(await screen.findByText('No se pudo buscar. Probá de nuevo.')).toBeInTheDocument();
  });
});
