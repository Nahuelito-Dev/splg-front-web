import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Distributor } from '../../../services/api/types';

const mutate = vi.hoisted(() => vi.fn<[{ id: string; changes: Record<string, unknown> }], void>());
vi.mock('../../../services/queries/distributors', () => ({
  useCreateDistributor: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateDistributor: () => ({ mutate, isPending: false }),
}));

import { DistributorFormModal } from './DistributorFormModal';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const distributor = {
  distributor_id: 'd-1',
  name: 'Gas del Norte',
  slug: 'gas-del-norte',
  legal_name: null,
  tax_id: null,
  email: null,
  phone: null,
  logo_url: 'https://cdn.example/logo.png',
  photoUrl: 'https://splg.s3.amazonaws.com/distributors/d-1/logo.png?X-Amz-Signature=abc',
} as unknown as Distributor;

describe('DistributorFormModal (edición)', () => {
  it('nunca reenvía photoUrl ni logo_url: el back rechaza con 400 un logo_url firmado', async () => {
    render(<DistributorFormModal open onClose={vi.fn()} distributor={distributor} />);
    fireEvent.change(screen.getByLabelText(/Nombre/), { target: { value: 'Gas del Norte SRL' } });
    fireEvent.click(screen.getByRole('button', { name: /Guardar/ }));
    await waitFor(() => expect(mutate).toHaveBeenCalled());
    const { changes } = mutate.mock.calls[0][0];
    expect(changes).not.toHaveProperty('photoUrl');
    expect(changes).not.toHaveProperty('logo_url');
    expect(JSON.stringify(changes)).not.toContain('X-Amz-Signature');
    expect(changes).toMatchObject({ name: 'Gas del Norte SRL' });
  });
});
