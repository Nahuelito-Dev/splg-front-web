import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TABLE_DENSE_KEY } from '../../../hooks/useLogout';
import { DataTable } from './DataTable';

interface Row {
  id: string;
  name: string;
}

const rows: Row[] = [{ id: '1', name: 'Ana' }];
const columns = [{ field: 'name', headerName: 'Nombre', flex: 1 }];

const table = () => <DataTable rows={rows} columns={columns} getRowId={(r) => r.id} />;

beforeEach(() => localStorage.clear());
afterEach(cleanup);

const rowHeight = () => document.querySelector<HTMLElement>('.MuiDataGrid-row')?.style.minHeight;

describe('DataTable densidad', () => {
  it('el pie ofrece «Denso», apagado por defecto', () => {
    render(table());
    expect(screen.getByRole('switch', { name: 'Denso' })).toHaveAttribute('aria-checked', 'false');
  });

  it('al prenderlo se recuerda en el dispositivo', () => {
    render(table());
    fireEvent.click(screen.getByRole('switch', { name: 'Denso' }));
    expect(screen.getByRole('switch', { name: 'Denso' })).toHaveAttribute('aria-checked', 'true');
    expect(localStorage.getItem(TABLE_DENSE_KEY)).toBe('1');
  });

  it('la fila mide 60 px y, con «Denso», 44 px', () => {
    render(table());
    expect(rowHeight()).toBe('60px');
    fireEvent.click(screen.getByRole('switch', { name: 'Denso' }));
    expect(rowHeight()).toBe('44px');
    fireEvent.click(screen.getByRole('switch', { name: 'Denso' }));
    expect(rowHeight()).toBe('60px');
  });

  it('arranca denso si quedó guardado', () => {
    localStorage.setItem(TABLE_DENSE_KEY, '1');
    render(table());
    expect(screen.getByRole('switch', { name: 'Denso' })).toHaveAttribute('aria-checked', 'true');
  });
});
