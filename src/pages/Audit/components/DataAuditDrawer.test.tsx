import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { AuditEntryV2 } from '../../../services/api/types';
import { DataAuditDrawer } from './DataAuditDrawer';

afterEach(cleanup);

const ENTRY = {
  auditId: 'a-1',
  actionType: { id: 2, name: 'Modificación' },
  userId: 'u-1',
  user: { userId: 'u-1', fullName: 'Admin Litoral', email: 'admin@splg.com', deleted: false },
  distributorId: 'd-1',
  entity: 'Cylinder',
  recordId: 'c-1',
  ip: '::1',
  dateTime: '2026-10-10T18:53:01.000Z',
  details: [
    { auditDetailId: 'x-1', field: 'state', oldValue: 'in_depot', newValue: 'retired' },
    { auditDetailId: 'x-2', field: 'note', oldValue: null, newValue: '[oculto]' },
  ],
  origin: 'user',
  source: 'db',
  tableName: 'cylinders',
  dbUser: 'splg_app',
  appName: 'splg-api',
} as AuditEntryV2;

describe('DataAuditDrawer', () => {
  it('muestra cada campo con su valor anterior y el nuevo', () => {
    render(<DataAuditDrawer entry={ENTRY} onClose={() => undefined} />);
    const row = screen.getByRole('row', { name: /state/ });
    expect(within(row).getByText('in_depot')).toBeInTheDocument();
    expect(within(row).getByText('retired')).toBeInTheDocument();
    expect(screen.getByText('Envase físico', { selector: 'dd' })).toBeInTheDocument();
    expect(screen.getByText('Admin Litoral')).toBeInTheDocument();
  });

  it('un valor nulo se ve como raya y lo oculto se muestra tal cual', () => {
    render(<DataAuditDrawer entry={ENTRY} onClose={() => undefined} />);
    const row = screen.getByRole('row', { name: /note/ });
    expect(within(row).getByText('—')).toBeInTheDocument();
    expect(within(row).getByText('[oculto]')).toBeInTheDocument();
  });

  it('muestra la sección «Origen técnico» con la tabla, el usuario de la base y la aplicación', () => {
    render(
      <DataAuditDrawer
        entry={{ ...ENTRY, user: null, origin: 'direct', dbUser: 'postgres' }}
        onClose={() => undefined}
      />,
    );
    expect(screen.getByText('Origen técnico')).toBeInTheDocument();
    expect(screen.getByText('Base de datos (trigger)')).toBeInTheDocument();
    expect(screen.getByText('cylinders')).toBeInTheDocument();
    expect(screen.getByText('postgres')).toBeInTheDocument();
    expect(screen.getByText('splg-api')).toBeInTheDocument();
    expect(screen.getByText('SQL directo (postgres)')).toBeInTheDocument();
  });

  it('un ingreso fallido de Sesion se ve como lista legible, sin tabla anterior/nuevo', () => {
    const failed = {
      ...ENTRY,
      entity: 'Sesion',
      recordId: 'x@y.com',
      actionType: { id: 7, name: 'Ingreso fallido' },
      user: null,
      userId: null,
      origin: 'system',
      source: 'app',
      details: [
        { auditDetailId: 's-1', field: 'email', oldValue: null, newValue: 'x@y.com' },
        { auditDetailId: 's-2', field: 'motivo', oldValue: null, newValue: 'Clave incorrecta' },
      ],
    } as AuditEntryV2;
    render(<DataAuditDrawer entry={failed} onClose={() => undefined} />);
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.getByText('Motivo')).toBeInTheDocument();
    expect(screen.getByText('Clave incorrecta')).toBeInTheDocument();
    expect(screen.getByText('Intento: x@y.com')).toBeInTheDocument();
    expect(screen.getByText('Aplicación', { selector: 'dd' })).toBeInTheDocument();
  });
});
