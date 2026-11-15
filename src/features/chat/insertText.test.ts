import { describe, expect, it } from 'vitest';
import { insertAt } from './insertText';

describe('insertar una sugerencia en el compositor', () => {
  it('vacío: queda sólo lo insertado', () => {
    expect(insertAt('', 'Hola')).toEqual({ text: 'Hola', caret: 4 });
    expect(insertAt('   ', 'Hola')).toEqual({ text: 'Hola', caret: 4 });
  });

  it('al final, con un espacio si hace falta', () => {
    expect(insertAt('Ramón,', 'ya sale')).toEqual({ text: 'Ramón, ya sale', caret: 14 });
    expect(insertAt('Ramón, ', 'ya sale')).toEqual({ text: 'Ramón, ya sale', caret: 14 });
  });

  it('en el medio, sin pegarse a las palabras; con una selección, la reemplaza', () => {
    expect(insertAt('Hola Ana', 'querida', 4)).toEqual({ text: 'Hola querida Ana', caret: 12 });
    expect(insertAt('Hola XXX Ana', 'querida', 5, 8)).toEqual({ text: 'Hola querida Ana', caret: 12 });
  });
});
