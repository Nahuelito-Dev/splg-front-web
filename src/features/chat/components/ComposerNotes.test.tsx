import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readNoteDraft } from '../composerDraft';
import { Composer, type MentionSource } from './Composer';

afterEach(() => {
  cleanup();
  sessionStorage.clear();
});

const TEAM: MentionSource = {
  options: [
    { userId: 'u-2', fullName: 'Beto Despacho' },
    { userId: 'u-3', fullName: 'Belén Ríos' },
    { userId: 'u-4', fullName: 'Carla Gómez' },
    { userId: 'u-5', fullName: 'Ana' },
    { userId: 'u-6', fullName: 'Ana María Paz' },
    { userId: 'u-7', fullName: 'Juan Pérez' },
    { userId: 'u-8', fullName: 'Juan Pérez' },
  ],
  error: false,
};

type Props = Partial<Parameters<typeof Composer>[0]>;

const setup = (props: Props = {}) => {
  const onSend = vi.fn();
  const onTyping = vi.fn();
  const onNoteModeChange = vi.fn();
  const view = render(
    <Composer
      draftKey="conv-1"
      onSend={onSend}
      onTyping={onTyping}
      allowInternal
      mentionSource={TEAM}
      onNoteModeChange={onNoteModeChange}
      {...props}
    />,
  );
  return { onSend, onTyping, onNoteModeChange, view };
};

/** Escribe con el cursor al final (como tipear). */
const type = (box: HTMLElement, value: string) =>
  fireEvent.change(box, { target: { value, selectionStart: value.length, selectionEnd: value.length } });

const noteBox = () => screen.getByRole('combobox', { name: 'Nota interna' });
const toNote = () => fireEvent.click(screen.getByRole('button', { name: 'Nota interna' }));
/** Escribe `@<query>` al final y elige la opción `name` con el teclado. */
const mention = (before: string, query: string, name: string) => {
  const box = noteBox();
  type(box, `${before}@${query}`);
  const options = screen.getAllByRole('option');
  const index = options.findIndex((o) => o.textContent?.includes(name));
  for (let i = 0; i < index; i += 1) fireEvent.keyDown(box, { key: 'ArrowDown' });
  fireEvent.keyDown(box, { key: 'Enter' });
};

describe('Composer: nota interna con @menciones (4a)', () => {
  it('«Nota interna» se distingue del mensaje y el campo es un combobox con autocompletado', () => {
    const { onNoteModeChange } = setup();
    expect(screen.getByRole('textbox', { name: 'Mensaje' })).not.toHaveAttribute('aria-expanded');
    toNote();
    expect(onNoteModeChange).toHaveBeenCalledWith(true);
    const box = noteBox();
    expect(box).toHaveAccessibleDescription(/Sólo lo ve el equipo/);
    expect(box).toHaveAttribute('aria-autocomplete', 'list');
    expect(box).toHaveAttribute('aria-expanded', 'false');
    type(box, '@be');
    expect(box).toHaveAttribute('aria-expanded', 'true');
    expect(box).toHaveAttribute('aria-controls', screen.getByRole('listbox', { name: 'Personas del equipo' }).id);
  });

  it('el «escribiendo…» de una nota va siempre con la marca `internal`; el del mensaje, sin ella', () => {
    const { onTyping } = setup();
    type(screen.getByRole('textbox', { name: 'Mensaje' }), 'hola');
    expect(onTyping).toHaveBeenLastCalledWith(false);
    toNote();
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 10_000);
    type(noteBox(), 'para el equipo');
    vi.useRealTimers();
    expect(onTyping).toHaveBeenLastCalledWith(true);
    expect(onTyping).toHaveBeenCalledTimes(2);
  });

  it('`@` abre al equipo; flechas y Enter eligen; la nota sale como interna con la mención', () => {
    const { onSend } = setup();
    toNote();
    const box = noteBox();
    type(box, 'Ojo @be');
    const options = screen.getAllByRole('option');
    // Filtra sin tildes: «be» encuentra a Beto y a Belén, no a Carla.
    expect(options).toHaveLength(2);
    expect(options[0]).toHaveAccessibleName('Beto Despacho');
    expect(options[1]).toHaveAccessibleName('Belén Ríos');
    fireEvent.keyDown(box, { key: 'ArrowDown' });
    expect(box).toHaveAttribute('aria-activedescendant', options[1].id);
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(onSend).not.toHaveBeenCalled();
    expect(box).toHaveValue('Ojo @Belén Ríos ');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    type(box, 'Ojo @Belén Ríos fijate el pedido');
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(onSend).toHaveBeenCalledWith('Ojo @Belén Ríos fijate el pedido', {
      visibility: 'internal',
      mentions: ['u-3'],
      mentionTokens: [{ userId: 'u-3', fullName: 'Belén Ríos', start: 4 }],
    });
    expect(box).toHaveValue('');
  });

  it('busca también por apellido y con espacios mientras alguien coincida', () => {
    setup();
    toNote();
    const box = noteBox();
    type(box, '@despa');
    expect(screen.getAllByRole('option')).toHaveLength(1);
    expect(screen.getByRole('option')).toHaveAccessibleName('Beto Despacho');
    type(box, '@beto des');
    expect(screen.getByRole('option')).toHaveAccessibleName('Beto Despacho');
    // Con un espacio y nadie que coincida, es texto: la lista se cierra.
    type(box, '@beto desx y algo más');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('las menciones son por ocurrencia: «@Ana» dentro de «@Ana María Paz» no cuenta y tocar el nombre la saca', () => {
    const { onSend } = setup();
    toNote();
    mention('', 'ana mar', 'Ana María Paz');
    const box = noteBox();
    // Se escribe «@Ana» a mano (sin elegirla de la lista): no es una mención.
    type(box, '@Ana María Paz y @Ana');
    fireEvent.keyDown(box, { key: 'Escape' });
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(onSend).toHaveBeenLastCalledWith('@Ana María Paz y @Ana', {
      visibility: 'internal',
      mentions: ['u-6'],
      mentionTokens: [{ userId: 'u-6', fullName: 'Ana María Paz', start: 0 }],
    });
    // Elegida y después retocada («@Ana María Pazos»): ya no es la mención.
    mention('', 'ana mar', 'Ana María Paz');
    type(noteBox(), '@Ana María Pazos ');
    fireEvent.keyDown(noteBox(), { key: 'Enter' });
    expect(onSend).toHaveBeenLastCalledWith('@Ana María Pazos', { visibility: 'internal' });
  });

  it('dos personas con el mismo nombre se distinguen en la lista y se mencionan por separado', () => {
    const { onSend } = setup();
    toNote();
    type(noteBox(), '@juan');
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(2);
    for (const option of options) expect(option).toHaveTextContent('mismo nombre: mirá la foto');
    fireEvent.keyDown(noteBox(), { key: 'ArrowDown' });
    fireEvent.keyDown(noteBox(), { key: 'Enter' });
    const box = noteBox();
    type(box, `${(box as HTMLTextAreaElement).value}y `);
    mention((box as HTMLTextAreaElement).value, 'juan', 'Juan Pérez');
    fireEvent.keyDown(noteBox(), { key: 'Enter' });
    expect(onSend).toHaveBeenCalledWith('@Juan Pérez y @Juan Pérez', {
      visibility: 'internal',
      mentions: ['u-8', 'u-7'],
      mentionTokens: [
        { userId: 'u-8', fullName: 'Juan Pérez', start: 0 },
        { userId: 'u-7', fullName: 'Juan Pérez', start: 14 },
      ],
    });
  });

  it('Enter con una `@` sin coincidencias, cargando o con error no envía; Esc la deja como texto', () => {
    const { onSend } = setup();
    toNote();
    const box = noteBox();
    type(box, 'Mejor no aviso @zz');
    expect(screen.getByRole('status')).toHaveTextContent('Nadie del equipo que atiende este canal se llama así');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(onSend).not.toHaveBeenCalled();
    fireEvent.keyDown(box, { key: 'Escape' });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(onSend).toHaveBeenCalledWith('Mejor no aviso @zz', { visibility: 'internal' });
  });

  it('cargando o con error, el aviso va fuera de la lista (role=status) y Enter no envía', () => {
    const { onSend } = setup({ mentionSource: { options: undefined, error: false } });
    toNote();
    type(noteBox(), '@');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Cargando el equipo…');
    fireEvent.keyDown(noteBox(), { key: 'Enter' });
    expect(onSend).not.toHaveBeenCalled();
    cleanup();
    sessionStorage.clear();
    setup({ mentionSource: { options: undefined, error: true } });
    toNote();
    type(noteBox(), '@');
    expect(screen.getByRole('status')).toHaveTextContent('No se pudo cargar el equipo');
  });

  it('en el mensaje al cliente `@` no abre nada y sale como mensaje (sin menciones)', () => {
    const { onSend } = setup();
    const box = screen.getByRole('textbox', { name: 'Mensaje' });
    type(box, 'Hola @be');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(onSend).toHaveBeenCalledWith('Hola @be', { visibility: 'all' });
  });
});

describe('Composer: la nota nunca cae en el borrador del cliente', () => {
  it('cada modo tiene su borrador; las menciones se guardan con el de la nota y vuelven al recargar', () => {
    const { view } = setup();
    type(screen.getByRole('textbox', { name: 'Mensaje' }), 'Para el cliente');
    toNote();
    expect(noteBox()).toHaveValue('');
    mention('Sólo para el equipo ', 'beto', 'Beto Despacho');
    expect(sessionStorage.getItem('chatDraft:conv-1')).toBe('Para el cliente');
    expect(readNoteDraft('conv-1')).toEqual({
      text: 'Sólo para el equipo @Beto Despacho ',
      mentions: [{ userId: 'u-2', fullName: 'Beto Despacho', start: 20 }],
    });
    fireEvent.click(screen.getByRole('button', { name: 'Responder' }));
    expect(screen.getByRole('textbox', { name: 'Mensaje' })).toHaveValue('Para el cliente');
    // Se va de la conversación (o recarga) y vuelve: la nota sigue con su mención.
    view.unmount();
    const { onSend } = setup();
    toNote();
    expect(noteBox()).toHaveValue('Sólo para el equipo @Beto Despacho ');
    fireEvent.keyDown(noteBox(), { key: 'Enter' });
    expect(onSend).toHaveBeenCalledWith('Sólo para el equipo @Beto Despacho', {
      visibility: 'internal',
      mentions: ['u-2'],
      mentionTokens: [{ userId: 'u-2', fullName: 'Beto Despacho', start: 20 }],
    });
  });

  it('una nota descartada vuelve al borrador de notas con sus menciones y el compositor pasa a nota', () => {
    const { view, onNoteModeChange } = setup();
    type(screen.getByRole('textbox', { name: 'Mensaje' }), 'Para el cliente');
    view.rerender(
      <Composer
        draftKey="conv-1"
        onSend={vi.fn()}
        allowInternal
        mentionSource={TEAM}
        onNoteModeChange={onNoteModeChange}
        draft={{
          text: 'Ojo @Beto Despacho',
          nonce: 1,
          internal: true,
          mentions: [{ userId: 'u-2', fullName: 'Beto Despacho', start: 4 }],
        }}
      />,
    );
    expect(noteBox()).toHaveValue('Ojo @Beto Despacho');
    expect(onNoteModeChange).toHaveBeenLastCalledWith(true);
    expect(sessionStorage.getItem('chatDraft:conv-1')).toBe('Para el cliente');
    expect(readNoteDraft('conv-1').mentions).toEqual([{ userId: 'u-2', fullName: 'Beto Despacho', start: 4 }]);
  });

  it('el rescate de una nota rechazada va al borrador de notas, aunque se esté escribiendo al cliente', () => {
    const { view } = setup();
    type(screen.getByRole('textbox', { name: 'Mensaje' }), 'Para el cliente');
    view.rerender(
      <Composer
        draftKey="conv-1"
        onSend={vi.fn()}
        allowInternal
        mentionSource={TEAM}
        rescue={{ text: 'Nota editada', nonce: 1, internal: true }}
      />,
    );
    expect(noteBox()).toHaveValue('Nota editada');
    expect(sessionStorage.getItem('chatDraft:conv-1')).toBe('Para el cliente');
  });
});
