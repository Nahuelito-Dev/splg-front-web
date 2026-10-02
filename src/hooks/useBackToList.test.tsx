import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { FROM_LIST_STATE, useBackToList } from './useBackToList';

const Ficha = () => {
  const back = useBackToList('/lista');
  return <button onClick={back}>volver</button>;
};

const Lista = () => {
  const navigate = useNavigate();
  return <button onClick={() => navigate('/ficha', { state: FROM_LIST_STATE })}>abrir</button>;
};

const renderAt = (entries: string[]) =>
  render(
    <MemoryRouter initialEntries={entries}>
      <Routes>
        <Route path="/lista" element={<Lista />} />
        <Route path="/ficha" element={<Ficha />} />
        <Route path="/otra" element={<p>otra</p>} />
      </Routes>
    </MemoryRouter>,
  );

describe('useBackToList', () => {
  afterEach(cleanup);

  it('si se llegó desde la lista, vuelve a la misma entrada (con sus filtros)', () => {
    renderAt(['/lista?state=filled']);
    fireEvent.click(screen.getByText('abrir'));
    fireEvent.click(screen.getByText('volver'));
    expect(screen.getByText('abrir')).toBeInTheDocument();
  });

  it('si se entró directo, va a la lista por defecto', () => {
    renderAt(['/otra', '/ficha']);
    fireEvent.click(screen.getByText('volver'));
    expect(screen.getByText('abrir')).toBeInTheDocument();
  });
});
