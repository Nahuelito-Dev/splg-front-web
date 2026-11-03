import '@testing-library/jest-dom/vitest';
import type { GridColDef } from '@mui/x-data-grid';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ProcessRun } from '../../../services/api/types';

// La grilla de MUI no dibuja filas en jsdom: se reemplaza por una que evalúa los valores de cada columna.
vi.mock('../../../common/components/ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  DataTable: ({ rows, columns }: { rows: ProcessRun[]; columns: GridColDef<ProcessRun>[] }) => (
    <table>
      <thead>
        <tr>
          {columns.map((c) => (
            <th key={c.field}>{c.headerName}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id}>
            {columns.map((c) => (
              <td key={c.field}>
                {c.valueGetter ? String((c.valueGetter as (p: { row: ProcessRun }) => unknown)({ row })) : ''}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  ),
}));

import { ProcessRunsTable } from './ProcessRunsTable';

const run = (over: Partial<ProcessRun>): ProcessRun => ({
  id: 'r1',
  process: 'fleet_alerts',
  title: 'Aviso de vencimientos de flota',
  distributorId: null,
  startedAt: '2026-11-03T12:00:00.000Z',
  finishedAt: '2026-11-03T12:00:02.000Z',
  durationMs: 1800,
  status: 'ok',
  counters: {},
  error: null,
  trigger: 'cron',
  ...over,
});

afterEach(cleanup);

describe('ProcessRunsTable', () => {
  it('muestra cómo se disparó cada corrida: programada, manual o por webhook', () => {
    render(
      <ProcessRunsTable
        rows={[run({ id: 'a' }), run({ id: 'b', trigger: 'webhook' }), run({ id: 'c', trigger: 'manual' })]}
        total={3}
        loading={false}
        pagination={{ page: 0, pageSize: 25 }}
        onPaginationChange={() => undefined}
      />,
    );
    expect(screen.getByText('Disparo')).toBeInTheDocument();
    expect(screen.getByText('Programada')).toBeInTheDocument();
    expect(screen.getByText('Webhook')).toBeInTheDocument();
    expect(screen.getByText('Manual')).toBeInTheDocument();
  });
});
