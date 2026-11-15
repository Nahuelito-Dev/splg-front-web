import { describe, expect, it } from 'vitest';
import { ApiError } from '../../services/api/errors';
import {
  copiedMessage,
  copyBlockedReason,
  copyButtonLabel,
  fullHint,
  templatesToAdd,
  counterLevel,
  faqSchema,
  faqServerErrors,
  filterFaqs,
  hasHtml,
  keyedFaqSchema,
  suggestKey,
  textLength,
  toFaqBody,
} from './faqRules';

const issues = (result: {
  success: boolean;
  error?: { issues: Array<{ path: (string | number)[]; message: string }> };
}) => result.error?.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`) ?? [];

describe('textLength: como cuenta el back (puntos de código, sin los bordes)', () => {
  it('un emoji fuera del plano básico es uno; «✔️» son dos', () => {
    expect('😀'.length).toBe(2);
    expect(textLength('😀')).toBe(1);
    expect(textLength('✔️')).toBe(2);
  });

  it('no cuenta los espacios de los bordes', () => {
    expect(textLength('  hola  ')).toBe(4);
  });
});

describe('hasHtml: igual que el back', () => {
  it.each(['<b>hola</b>', '</p>', '<!-- x -->', '&amp;', '&lt', '&#60;'])('«%s» es HTML', (text) => {
    expect(hasHtml(text)).toBe(true);
  });

  it.each(['< 5 kg', '3 & 4 kg', 'a<5', 'precio & envío'])('«%s» es texto', (text) => {
    expect(hasHtml(text)).toBe(false);
  });
});

describe('faqSchema', () => {
  it('acepta una pregunta y una respuesta válidas', () => {
    expect(faqSchema.safeParse({ question: '¿Hasta qué hora?', answer: 'Hasta las 20.' }).success).toBe(true);
  });

  it('pregunta de 5 a 200 y respuesta de 1 a 1500, contadas como el back', () => {
    expect(issues(faqSchema.safeParse({ question: 'Hola', answer: 'x' }))).toEqual([
      'question: Tiene que tener entre 5 y 200 caracteres',
    ]);
    expect(faqSchema.safeParse({ question: 'a'.repeat(200), answer: 'x'.repeat(1500) }).success).toBe(true);
    expect(issues(faqSchema.safeParse({ question: 'a'.repeat(201), answer: 'x'.repeat(1501) }))).toEqual([
      'question: Tiene que tener entre 5 y 200 caracteres',
      'answer: Tiene que tener entre 1 y 1500 caracteres',
    ]);
    // 1500 emojis son 3000 en `length` de JS pero 1500 para el back: pasa.
    expect(faqSchema.safeParse({ question: '¿Emojis?', answer: '😀'.repeat(1500) }).success).toBe(true);
    // Los espacios de los bordes no cuentan: «  Hola  » tiene 4.
    expect(faqSchema.safeParse({ question: '  Hola  ', answer: 'x' }).success).toBe(false);
  });

  it('vacío pide el texto (no «entre 5 y 200»)', () => {
    expect(issues(faqSchema.safeParse({ question: '   ', answer: '' }))).toEqual([
      'question: Escribí la pregunta',
      'answer: Escribí la respuesta',
    ]);
  });

  it('rechaza HTML y deja pasar un «<» o un «&» sueltos', () => {
    expect(issues(faqSchema.safeParse({ question: '¿Qué es <b>esto</b>?', answer: 'Uno &amp; otro' }))).toEqual([
      'question: No puede llevar HTML (ni etiquetas como <b> ni códigos como &amp;): escribí texto plano',
      'answer: No puede llevar HTML (ni etiquetas como <b> ni códigos como &amp;): escribí texto plano',
    ]);
    expect(faqSchema.safeParse({ question: '¿Tienen de < 5 kg?', answer: 'Sí: 3 & 4 kg' }).success).toBe(true);
  });

  it('manda el texto sin los espacios de los bordes', () => {
    expect(toFaqBody({ question: '  ¿Hola?  ', answer: ' Sí \n' })).toEqual({ question: '¿Hola?', answer: 'Sí' });
  });
});

describe('keyedFaqSchema: la clave', () => {
  const base = { question: '¿Medios de pago?', answer: 'Efectivo.' };

  it.each(['medios_de_pago', 'ab', 'horario24'])('«%s» es válida', (key) => {
    expect(keyedFaqSchema.safeParse({ ...base, key }).success).toBe(true);
  });

  it.each(['Medios', 'medios-de-pago', '_medios', 'medios_', 'medios__pago', 'a', 'x'.repeat(61), 'con espacio'])(
    '«%s» no es válida',
    (key) => {
      expect(keyedFaqSchema.safeParse({ ...base, key }).success).toBe(false);
    },
  );

  it('vacía pide la clave', () => {
    expect(issues(keyedFaqSchema.safeParse({ ...base, key: '' }))).toContain('key: Escribí la clave');
  });
});

describe('suggestKey', () => {
  it('arma una clave válida a partir de la pregunta', () => {
    expect(suggestKey('¿Qué medios de pago aceptan?')).toBe('que_medios_de_pago_aceptan');
    expect(suggestKey('¿Llegan a Oberá?')).toBe('llegan_a_obera');
    expect(suggestKey('')).toBe('');
  });

  it('no pasa de 60 ni termina en guion bajo', () => {
    const key = suggestKey(`${'palabra '.repeat(20)}`);
    expect(key.length).toBeLessThanOrEqual(60);
    expect(key.endsWith('_')).toBe(false);
  });
});

describe('faqServerErrors: cada error del back junto a su campo', () => {
  it('409 duplicada → la pregunta', () => {
    expect(faqServerErrors(new ApiError(409, ['Ya hay…'], 'ASSISTANT_FAQ_DUPLICATE'))).toEqual([
      { field: 'question', message: 'Ya hay una pregunta igual en la base (sin contar mayúsculas)' },
    ]);
  });

  it('409 clave ocupada → la clave', () => {
    expect(faqServerErrors(new ApiError(409, ['Ya hay…'], 'ASSISTANT_FAQ_KEY_TAKEN'))).toEqual([
      { field: 'key', message: 'Ya hay una pregunta con esa clave: elegí otra' },
    ]);
  });

  it('409 tope → de la base entera, con el texto del back', () => {
    const message = 'La base ya tiene 200 preguntas frecuentes, el máximo: dá de baja alguna antes de agregar otra';
    expect(faqServerErrors(new ApiError(409, [message], 'ASSISTANT_FAQ_LIMIT_REACHED'))).toEqual([
      { field: null, message },
    ]);
  });

  it('400 por campo, según el prefijo del mensaje; lo demás, general', () => {
    expect(
      faqServerErrors(
        new ApiError(400, [
          'Pregunta: tiene que tener entre 5 y 200 caracteres',
          'Respuesta: no puede llevar HTML (ni etiquetas como <b> ni códigos como &amp;); escribí texto plano',
          'Clave: no tiene un formato válido',
          'Se envió un dato que no corresponde',
        ]),
      ),
    ).toEqual([
      { field: 'question', message: 'Tiene que tener entre 5 y 200 caracteres' },
      {
        field: 'answer',
        message: 'No puede llevar HTML (ni etiquetas como <b> ni códigos como &amp;); escribí texto plano',
      },
      { field: 'key', message: 'No tiene un formato válido' },
      { field: null, message: 'Se envió un dato que no corresponde' },
    ]);
  });
});

describe('filterFaqs', () => {
  const items = [
    { id: 'b', position: 2, question: '¿Qué medios de pago aceptan?', answer: 'Efectivo', key: 'medios_de_pago' },
    { id: 'a', position: 1, question: '¿Cómo hago un pedido?', answer: 'Desde la app', key: null },
    { id: 'c', position: 3, question: '¿Llegan a mi zona?', answer: 'Cargá tu dirección', key: 'zona' },
  ];

  it('sin búsqueda, todas en el orden de la base (position)', () => {
    expect(filterFaqs(items, '').map((f) => f.id)).toEqual(['a', 'b', 'c']);
  });

  it('busca en pregunta, respuesta y clave, sin mayúsculas ni tildes', () => {
    expect(filterFaqs(items, 'COMO').map((f) => f.id)).toEqual(['a']);
    expect(filterFaqs(items, 'direccion').map((f) => f.id)).toEqual(['c']);
    expect(filterFaqs(items, 'medios_de').map((f) => f.id)).toEqual(['b']);
    expect(filterFaqs(items, 'nada')).toEqual([]);
  });
});

describe('copiedMessage', () => {
  it('dice cuántas copió; cero es «ya las tenías» (copiar es idempotente)', () => {
    expect(copiedMessage(5)).toBe('Se sumaron 5 preguntas de ejemplo');
    expect(copiedMessage(1)).toBe('Se sumó 1 pregunta de ejemplo');
    expect(copiedMessage(0)).toBe('Ya tenías todas las preguntas de ejemplo: no se sumó ninguna');
  });
});

describe('counterLevel', () => {
  it('normal, desde el 90 % del tope y pasado', () => {
    expect(counterLevel(179, 200)).toBe('ok');
    expect(counterLevel(180, 200)).toBe('near');
    expect(counterLevel(200, 200)).toBe('near');
    expect(counterLevel(201, 200)).toBe('over');
  });
});

describe('templatesToAdd', () => {
  it('cuenta sólo las que la base todavía no tiene', () => {
    expect(templatesToAdd([{ alreadyInBase: true }, { alreadyInBase: false }, { alreadyInBase: false }])).toBe(2);
    expect(templatesToAdd([{ alreadyInBase: true }])).toBe(0);
    expect(templatesToAdd([])).toBe(0);
  });
});

describe('fullHint', () => {
  it('sólo en el tope, y con «da» sin tilde', () => {
    expect(fullHint(199, 200)).toBeUndefined();
    expect(fullHint(200, 200)).toBe('Llegaste al máximo de 200 preguntas: da de baja alguna para agregar otra');
  });
});

describe('faqServerErrors: el catálogo de preguntas de ejemplo', () => {
  it('duplicada → pregunta; clave ocupada → clave; tope → general', () => {
    expect(faqServerErrors(new ApiError(409, ['x'], 'ASSISTANT_TEMPLATE_DUPLICATE'))).toEqual([
      { field: 'question', message: 'Ya hay una pregunta de ejemplo igual (sin contar mayúsculas)' },
    ]);
    expect(faqServerErrors(new ApiError(409, ['x'], 'ASSISTANT_TEMPLATE_KEY_TAKEN'))).toEqual([
      { field: 'key', message: 'Ya hay una pregunta con esa clave: elegí otra' },
    ]);
    expect(faqServerErrors(new ApiError(409, ['Tope del catálogo'], 'ASSISTANT_TEMPLATE_LIMIT_REACHED'))).toEqual([
      { field: null, message: 'Tope del catálogo' },
    ]);
  });
});

describe('copyBlockedReason: la copia es todo o nada', () => {
  const two = [{ alreadyInBase: false }, { alreadyInBase: false }, { alreadyInBase: true }];
  const base = { items: two, error: null, isFetching: false, count: 10, limit: 200 };

  it('con el catálogo al día y lugar en la base, se puede', () => {
    expect(copyBlockedReason(base)).toBeUndefined();
  });

  it('si no entran todas, dice cuántas dar de baja', () => {
    expect(copyBlockedReason({ ...base, count: 199 })).toBe(
      'Tu base tiene 199 de 200: da de baja al menos 1 para sumar estas 2',
    );
    expect(copyBlockedReason({ ...base, items: [{ alreadyInBase: false }], count: 200 })).toBe(
      'Tu base tiene 200 de 200: da de baja al menos 1 para sumar esta',
    );
    expect(copyBlockedReason({ ...base, count: 198 })).toBeUndefined();
  });

  it('con datos viejos (refrescando o con la recarga fallida) no decide', () => {
    expect(copyBlockedReason({ ...base, isFetching: true })).toBe('Actualizando las preguntas de ejemplo…');
    expect(copyBlockedReason({ ...base, error: new Error('x') })).toBe(
      'No se pudieron actualizar las preguntas de ejemplo',
    );
    expect(copyBlockedReason({ ...base, items: undefined, isFetching: true })).toBe(
      'Cargando las preguntas de ejemplo…',
    );
    expect(copyBlockedReason({ ...base, items: undefined, error: new Error('x') })).toBe(
      'No se pudieron cargar las preguntas de ejemplo',
    );
  });

  it('catálogo vacío o todas ya en la base', () => {
    expect(copyBlockedReason({ ...base, items: [] })).toBe('Todavía no hay preguntas de ejemplo para sumar');
    expect(copyBlockedReason({ ...base, items: [{ alreadyInBase: true }] })).toBe(
      'Ya tenés todas las preguntas de ejemplo en tu base',
    );
  });
});

describe('copyButtonLabel', () => {
  it('nunca «Sumar 0»: sin datos al día o sin nada para sumar, «Sumar preguntas»', () => {
    expect(copyButtonLabel(2, true)).toBe('Sumar 2 preguntas');
    expect(copyButtonLabel(1, true)).toBe('Sumar 1 pregunta');
    expect(copyButtonLabel(0, true)).toBe('Sumar preguntas');
    expect(copyButtonLabel(2, false)).toBe('Sumar preguntas');
  });
});
