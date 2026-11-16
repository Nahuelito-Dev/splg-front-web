import { afterEach, describe, expect, it } from 'vitest';
import { readNoteDraft, rebaseMentions, validMentions, writeNoteDraft, type MentionToken } from './composerDraft';

afterEach(() => sessionStorage.clear());

const beto: MentionToken = { userId: 'u-2', fullName: 'Beto Despacho', start: 4 };

describe('menciones por ocurrencia en el borrador de la nota', () => {
  it('se corren con lo que se escribe antes y siguen con lo que se escribe después', () => {
    expect(rebaseMentions('Ojo @Beto Despacho', 'Che, ojo @Beto Despacho', [beto])).toEqual([{ ...beto, start: 9 }]);
    expect(rebaseMentions('Ojo @Beto Despacho', 'Ojo @Beto Despacho mañana', [beto])).toEqual([beto]);
  });

  it('tocar el nombre (o pegarle una letra) la saca', () => {
    expect(rebaseMentions('Ojo @Beto Despacho', 'Ojo @Beto Despaxho', [beto])).toEqual([]);
    expect(rebaseMentions('Ojo @Beto Despacho', 'Ojo @Beto Despachos', [beto])).toEqual([]);
    expect(validMentions('Ojo @Beto Despacho.', [beto])).toEqual([beto]);
  });

  it('se guardan con el texto en la clave de la nota (no en la del cliente) y vuelven al leerla', () => {
    writeNoteDraft('conv-1', { text: 'Ojo @Beto Despacho', mentions: [beto] });
    expect(sessionStorage.getItem('chatDraft:conv-1')).toBeNull();
    expect(readNoteDraft('conv-1')).toEqual({ text: 'Ojo @Beto Despacho', mentions: [beto] });
    writeNoteDraft('conv-1', { text: '', mentions: [] });
    expect(sessionStorage.getItem('chatDraft:conv-1:nota')).toBeNull();
  });

  it('un borrador de texto suelto no se pierde: vuelve sin menciones', () => {
    sessionStorage.setItem('chatDraft:conv-1:nota', 'texto viejo sin JSON');
    expect(readNoteDraft('conv-1')).toEqual({ text: 'texto viejo sin JSON', mentions: [] });
  });
});
