import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MessageTemplate } from '../../../services/api/types';
import { Composer } from './Composer';

afterEach(() => {
  cleanup();
  sessionStorage.clear();
});

const template = (key: string, title: string, body: string): MessageTemplate => ({
  id: `tpl-${key}`,
  scope: 'platform_reply',
  key,
  title,
  body,
  active: true,
  updatedAt: '2026-11-14T10:00:00.000Z',
});

const REPLIES = [
  template('saludo', 'Saludo', 'Hola, ¿en qué te ayudo?'),
  template('logo', 'Cargar el logo', 'El logo se carga en Configuración → Apariencia.'),
];

const setup = () => {
  const onSend = vi.fn();
  render(<Composer onSend={onSend} quickReplies={REPLIES} />);
  const box = screen.getByRole('textbox', { name: 'Mensaje' });
  const key = (k: string) => fireEvent.keyDown(box, { key: k });
  fireEvent.change(box, { target: { value: '/' } });
  return { onSend, box, key };
};

describe('Composer: respuestas rápidas con teclado (corrección 1)', () => {
  it('«/» abre la lista con la primera opción activa', () => {
    const { box } = setup();
    const list = screen.getByRole('listbox', { name: 'Respuestas rápidas' });
    expect(list).toBeInTheDocument();
    const [first, second] = screen.getAllByRole('option');
    expect(first).toHaveAttribute('aria-selected', 'true');
    expect(second).toHaveAttribute('aria-selected', 'false');
    expect(box).toHaveAttribute('aria-activedescendant', first.id);
  });

  it('Flecha abajo + Enter elige la plantilla y NO envía «/»', () => {
    const { box, key, onSend } = setup();
    key('ArrowDown');
    expect(screen.getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true');
    expect(box).toHaveAttribute('aria-activedescendant', screen.getAllByRole('option')[1].id);
    key('Enter');
    expect(onSend).not.toHaveBeenCalled();
    expect(box).toHaveValue('El logo se carga en Configuración → Apariencia.');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('Flecha arriba da la vuelta y Tab también elige', () => {
    const { box, key } = setup();
    key('ArrowUp');
    key('Tab');
    expect(box).toHaveValue('El logo se carga en Configuración → Apariencia.');
  });

  it('Esc cierra la lista sin enviar; recién ahí Enter envía', () => {
    const { key, onSend } = setup();
    key('Escape');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    key('Enter');
    expect(onSend).toHaveBeenCalledWith('/', undefined);
  });

  it('con la lista abierta y sin coincidencias, Enter no envía', () => {
    const { box, key, onSend } = setup();
    fireEvent.change(box, { target: { value: '/zzz' } });
    expect(screen.getByText('Ninguna respuesta rápida coincide')).toBeInTheDocument();
    key('Enter');
    expect(onSend).not.toHaveBeenCalled();
  });

  it('el clic en una opción la elige', () => {
    const { box } = setup();
    fireEvent.mouseDown(screen.getByRole('option', { name: /Saludo/ }));
    expect(box).toHaveValue('Hola, ¿en qué te ayudo?');
  });
});
