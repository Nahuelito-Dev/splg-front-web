import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const audit = vi.hoisted(() => vi.fn());
vi.mock('../../../services/queries/audit', () => ({ useAudit: () => audit() as unknown }));

import { ClaimHistory } from './ClaimHistory';

afterEach(cleanup);

const row = (auditId: string, path: string, result: 'success' | 'failure', errorMessage: string | null = null) => ({
  auditId,
  httpMethod: 'PATCH',
  path,
  result,
  actorRole: 'admin',
  changes: null,
  errorMessage,
  createdAt: '2026-10-03T15:00:00.000Z',
});

const withRows = (rows: ReturnType<typeof row>[]) =>
  audit.mockReturnValue({ isPending: false, error: null, data: { rows, total: rows.length } });

const renderHistory = () => render(<ClaimHistory claimId="c-1" createdAt="2026-10-01T10:00:00.000Z" />);

describe('ClaimHistory', () => {
  it('muestra la frase, el autor y la fecha, nunca el método ni la ruta', () => {
    withRows([row('a-1', '/api/claims/:id/take', 'success')]);
    renderHistory();
    expect(screen.getByText('Tomó el reclamo')).toBeInTheDocument();
    expect(screen.getByText(/Admin/)).toBeInTheDocument();
    expect(screen.queryByText(/PATCH|\/api\/claims/)).not.toBeInTheDocument();
  });

  it('agrega el alta con la fecha del reclamo, al final (lo más viejo)', () => {
    withRows([row('a-1', '/api/claims/:id/take', 'success')]);
    renderHistory();
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[1]).toHaveTextContent('Se registró el reclamo');
  });

  it('los intentos fallidos van ocultos, con un botón que los despliega sin el error técnico', () => {
    withRows([
      row('a-1', '/api/claims/:id/take', 'success'),
      row('a-2', '/api/claims/:id/resolve', 'failure', 'resolution should not be empty'),
    ]);
    renderHistory();
    expect(screen.queryByText('Fallida')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar intentos fallidos (1)' }));
    expect(screen.getByText('Fallida')).toBeInTheDocument();
    expect(screen.getByText('No se pudo completar un cambio en el reclamo')).toBeInTheDocument();
    expect(screen.queryByText(/should not be empty/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ocultar intentos fallidos' }));
    expect(screen.queryByText('Fallida')).not.toBeInTheDocument();
  });

  it('sin intentos fallidos no hay botón', () => {
    withRows([row('a-1', '/api/claims/:id/take', 'success')]);
    renderHistory();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
