import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Los precios, saldos, totales y diferencias los calcula el back; el panel sólo los muestra. Si alguien vuelve a
 * hacer una cuenta de plata en `src/` (multiplicar o dividir un monto, restar o sumar montos, acumularlos), este test
 * falla. Lo que ya estaba antes y todavía no pasó al back figura en `PENDIENTES_DEL_BACK`, con su motivo: esa lista
 * sólo se achica.
 */

const PALABRAS =
  'price|subtotal|total|amount|surcharge|balance|deposit|difference|purchased|expected|declared|ticket|expenses?|cash|cents|sena|seña|declarado|gastos?|esperado|cobrado|saldo|importe|monto|precio';
/** Un identificador (con sus puntos) que lleva en el nombre una palabra de plata. */
const ID_MONTO = `[\\p{L}\\w.$]*(?:${PALABRAS})[\\p{L}\\w$]*`;
/** Lo que puede haber entre el monto y el operador: `?? 0`, `!`, `?` y paréntesis que cierran. */
const COLA = '(?:\\s*(?:\\?\\?|\\|\\|)\\s*[\\w.]+)?[\\s)!?]*';
/** Operador aritmético, con su forma de asignación (`+=`, `-=`), sin `++`, `--` ni flechas. */
const OP = '(?:[*]|/(?!>)|[+-])=?(?![+\\-])';
/** Dividir por el tamaño de página es paginar, no una cuenta. */
const NO_ES_PAGINA = '(?!\\s*[\\w.]*(?:[Pp]age|PAGE|[Ll]imit|LIMIT|[Ss]ize|pagination))';
/** Un texto delante del operador (`'Total: ' + total`) es armar un rótulo, no una cuenta. */
const NO_ES_ROTULO = '(?<!§\\s*)';

const CUENTAS: Record<string, RegExp> = {
  'monto antes del operador': new RegExp(`${ID_MONTO}${COLA}${OP}${NO_ES_PAGINA}`, 'giu'),
  'monto después del operador': new RegExp(`${NO_ES_ROTULO}${OP}\\s*\\(*\\s*[\\p{L}\\w.!?]*(?:${PALABRAS})`, 'giu'),
  'Decimal en el front': /\bDecimal\s*\(|\.(?:minus|plus|times|dividedBy|toDecimalPlaces)\(/gu,
  'acumula montos': new RegExp(
    `\\.(?:reduce|fold)(?:<[^>]*>)?\\([^;]{0,200}?(?:${PALABRAS})|(?:${PALABRAS})[^;]{0,80}?\\.(?:reduce|fold)(?:<[^>]*>)?\\(|(?:\\.sum\\b|\\bsum\\()[^;]{0,120}?(?:${PALABRAS})|(?:${PALABRAS})[^;]{0,80}?(?:\\.sum\\b|\\bsum\\()`,
    'giu',
  ),
};

/** Las cuentas de plata que hay en `codigo` (sin comentarios ni saltos de línea, para ver también las cortadas por prettier). */
export const cuentasDePlata = (codigo: string): string[] => {
  const plano = codigo
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:'"`])\/\/[^\n]*/g, '$1 ')
    .replace(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"/g, '§')
    .replace(/`((?:[^`\\]|\\.)*)`/g, (_, cuerpo: string) => '§' + (cuerpo.match(/\$\{[^}]*\}/g) ?? []).join(' '))
    .replace(/\s+/g, ' ');
  return Object.entries(CUENTAS).flatMap(([nombre, regla]) =>
    [...plano.matchAll(regla)].map((m) => `${nombre}: «${m[0].trim()}»`),
  );
};

/** Cuentas que no son de plata (porcentajes de conteos, existencias, calificaciones, expresiones regulares). */
const NO_SON_PLATA: Excepcion[] = [
  {
    ruta: 'src/common/components/ui/AnalyticSummary.tsx',
    fragmento: 'total = items.reduce(',
    motivo: 'suma de conteos de un resumen',
  },
  {
    ruta: 'src/common/components/ui/ShareDonutChart.tsx',
    fragmento: 'total) *',
    motivo: 'porción de un gráfico: cuenta casos, no pesos',
  },
  {
    ruta: 'src/common/components/ui/ShareDonutChart.tsx',
    fragmento: '/ total',
    motivo: 'porción de un gráfico: cuenta casos, no pesos',
  },
  {
    ruta: 'src/common/components/ui/ShareDonutChart.tsx',
    fragmento: 'total = data.reduce(',
    motivo: 'porción de un gráfico: cuenta casos, no pesos',
  },
  {
    ruta: 'src/common/components/ui/analyticShare.ts',
    fragmento: '/ total',
    motivo: 'porción de un conteo sobre su total',
  },
  {
    ruta: 'src/pages/Configuration/expressRules.ts',
    fragmento: 'surcharge *',
    motivo: 'recargo express: porcentaje de la regla de configuración, no un monto',
  },
  {
    ruta: 'src/pages/Configuration/expressRules.ts',
    fragmento: 'surcharge *',
    motivo: 'recargo express: porcentaje de la regla de configuración, no un monto',
  },
  {
    ruta: 'src/pages/Configuration/scheduledTasksRules.ts',
    fragmento: 'amount) *',
    motivo: 'unidad de tiempo de una tarea programada',
  },
  {
    ruta: 'src/pages/Home/views/StackedBar.tsx',
    fragmento: 'total = segments.reduce(',
    motivo: 'suma de segmentos de una barra de conteos',
  },
  { ruta: 'src/pages/Home/views/StatusDonutCard.tsx', fragmento: 'total) *', motivo: 'porción de pedidos por estado' },
  { ruta: 'src/pages/Home/views/StatusDonutCard.tsx', fragmento: '/ total', motivo: 'porción de pedidos por estado' },
  { ruta: 'src/pages/Orders/boardRules.ts', fragmento: 'total -', motivo: 'pedidos que faltan traer (conteo)' },
  {
    ruta: 'src/pages/Orders/components/reservationBody.ts',
    fragmento: 'total/',
    motivo: 'expresión regular de un mensaje, no una cuenta',
  },
  {
    ruta: 'src/pages/PhysicalCylinders/Recovery/RecoveryCasesTab.tsx',
    fragmento:
      '.reduce((a, b) => a + b, 0) : null, pending: counts ? (counts.escalated ?? 0) + (counts.lost ?? 0) : null, open: counts ? (counts.open ?? 0) : null, returned: counts ? (counts.returned ?? 0) : null, deposit',
    motivo: 'suma de casos por estado (conteo)',
  },
  { ruta: 'src/pages/Ratings/ratingStats.ts', fragmento: 'total /', motivo: 'porcentaje de calificaciones' },
  {
    ruta: 'src/pages/Ratings/ratingStats.ts',
    fragmento: 'total = ratings.reduce(',
    motivo: 'porcentaje de calificaciones',
  },
  {
    ruta: 'src/pages/Stock/StockSummary.tsx',
    fragmento: 'totals = (summary.data ?? []).reduce(',
    motivo: 'suma de existencias (unidades)',
  },
  {
    ruta: 'src/pages/Stock/stockAvailability.ts',
    fragmento: 'totals.set(key, { sum: current.sum',
    motivo: 'existencias (unidades)',
  },
  {
    ruta: 'src/services/queries/orders.ts',
    fragmento: 'total = values.some((count) => count === null) ? null : values.reduce<number>(',
    motivo: 'suma de conteos por estado',
  },
  {
    ruta: 'src/pages/RouteSheets/DaySummary.tsx',
    fragmento: '+ s.total',
    motivo: 'kilómetros estimados de las hojas del día (resumen), no plata',
  },
  {
    ruta: 'src/pages/RouteSheets/DaySummary.tsx',
    fragmento:
      '.reduce((sum, p) => sum + (p?.distanceMeters ?? 0), 0) / 1000 : sheets.reduce((sum, s) => sum + s.total',
    motivo: 'kilómetros por calles o estimados de las hojas del día (resumen), no plata',
  },
  {
    ruta: 'src/pages/RouteSheets/StopOrderDrawer.tsx',
    fragmento: '+ (item.emptiesExpected',
    motivo: 'envases vacíos a retirar del pedido: cantidad, no plata',
  },
  {
    ruta: 'src/pages/RouteSheets/StopOrderDrawer.tsx',
    fragmento: '.reduce((sum, item) => sum + (item.emptiesExpected',
    motivo: 'envases vacíos a retirar del pedido: cantidad, no plata',
  },
  {
    ruta: 'src/pages/RouteSheets/routeSheetLabels.ts',
    fragmento: '+ sheet.total',
    motivo: 'hora de regreso: salida más la duración en minutos',
  },
];

/**
 * Validación o formato de lo que el usuario tipea o ve (redondeo del importe tipeado, tope contra el saldo, signo o
 * valor absoluto para mostrar): no es un cálculo de montos de negocio. Se queda en el front por la regla de validar en
 * tres capas (formulario, DTO del back y base); el back sigue decidiendo. Criterio y freno: sólo entra acá lo que
 * valida o formatea un valor ya tipeado o ya calculado por el back; un total, saldo o diferencia que se arma para
 * mostrar o guardar NO entra y va a `PENDIENTES_DEL_BACK`. Cada una es un fragmento exacto de un archivo.
 */
const VALIDACION_Y_FORMATO_EN_EL_FRONT: Excepcion[] = [
  {
    ruta: 'src/common/components/expensePayment/expensePaymentSchema.ts',
    fragmento: 'Decimal(',
    motivo: 'valida un importe con Decimal en el front',
  },
  {
    ruta: 'src/pages/Finance/financeSchemas.ts',
    fragmento: 'box.balance) *',
    motivo: 'redondeo a centavos de un importe tipeado y tope contra el saldo de una caja',
  },
  {
    ruta: 'src/pages/Finance/financeSchemas.ts',
    fragmento: 'amount *',
    motivo: 'redondeo a centavos de un importe tipeado y tope contra el saldo de una caja',
  },
  {
    ruta: 'src/pages/Customers/CustomerDetails.tsx',
    fragmento: 'balance *',
    motivo: 'signo del saldo de cuenta corriente (¿debe, a favor, al día?)',
  },
  {
    ruta: 'src/pages/Finance/components/ApproveSettlementModal.tsx',
    fragmento: '-difference',
    motivo: 'muestra el faltante como valor positivo (-difference)',
  },
  {
    ruta: 'src/pages/Finance/components/SubmitSettlementModal.tsx',
    fragmento: '-difference',
    motivo: 'muestra el faltante como valor positivo (-difference); la diferencia ya la manda el back',
  },
  {
    ruta: 'src/pages/Finance/components/CloseSessionModal.tsx',
    fragmento: '-difference',
    motivo: 'muestra el faltante como valor positivo (-difference); la diferencia ya la manda el back',
  },
];

/**
 * Cuentas de plata que existían antes de esta regla y todavía no pasaron al back. Cada una es un fragmento exacto de
 * un archivo: tocar otra parte del archivo con una cuenta nueva sí se detecta. Sólo se achica: nada se agrega acá.
 */
const PENDIENTES_DEL_BACK: Excepcion[] = [
  {
    ruta: 'src/pages/Finance/incomeStatementPeriod.ts',
    fragmento: 'total) *',
    motivo: 'porcentaje de cada rubro del estado de resultados',
  },
  {
    ruta: 'src/pages/Finance/incomeStatementPeriod.ts',
    fragmento: '/ total',
    motivo: 'porcentaje de cada rubro del estado de resultados',
  },
];
interface Excepcion {
  ruta: string;
  /** El fragmento exacto que marca el detector (lo que sale entre « » en el mensaje del test). */
  fragmento: string;
  motivo: string;
}

const EXCEPCIONES: Excepcion[] = [...NO_SON_PLATA, ...VALIDACION_Y_FORMATO_EN_EL_FRONT, ...PENDIENTES_DEL_BACK];

const archivosDeCodigo = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const ruta = join(dir, e.name);
    if (e.isDirectory()) return archivosDeCodigo(ruta);
    return /\.(ts|tsx)$/.test(e.name) && !/\.(test|spec)\.|\.d\.ts$/.test(e.name) ? [ruta] : [];
  });

/** Los fragmentos de cuenta de `codigo`, sin el nombre de la regla. */
const fragmentos = (codigo: string): string[] => cuentasDePlata(codigo).map((c) => c.split('«')[1].slice(0, -1));

describe('el detector', () => {
  const marca: Record<string, string[]> = {
    'multiplicar o dividir un monto': [
      'const s = item.quantity * cylinder.price;',
      'const avg = totalPurchased / delivered.length;',
      'const pct = (1 - line.unitPrice / list) * 100;',
      'const v = unitPrice *\n    qty;',
      'const x = subtotal * 0.1;',
    ],
    'sumar o restar montos': [
      'const saldo = reservation.total - reservation.depositAmount;',
      'const diff = declared + expenses - expected;',
      'const d = parsed + spent - settlement.expectedCash;',
    ],
    'asignación compuesta con montos': [
      'let acc = 0; acc += order.total_amount;',
      'saldo -= payment.amount;',
      'total *= 1.21;',
      'balance /= 2;',
    ],
    'paréntesis entre el monto y el operador': [
      'const t = (o.total_amount ?? 0) - (d.deposit ?? 0);',
      'const t = Number(o.total) - other;',
      'const t = Number(o.total) + Number(p.total);',
      'const t = Math.round(balance) * 100;',
    ],
    'monto contra una variable sin nombre de monto': [
      'const r = s.expectedCash - d;',
      'const r = d - s.expectedCash;',
      'const r = k * item.price;',
    ],
    'nombres en castellano': [
      'const r = total - sena;',
      'const r = seña + gastos;',
      'const r = declarado + gastos - esperado;',
      'const r = cobrado - importe;',
      'const r = monto * precio;',
      'const r = saldo - x;',
    ],
    Decimal: [
      'const d = new Decimal(a).minus(b);',
      'const t = x.plus(y);',
      'const t = x.times(2).dividedBy(3);',
      'const d = Decimal(a);',
    ],
    'acumular con reduce, fold o sum': [
      'const t = orders.reduce((s, o) => s + o.total_amount, 0);',
      'const t = orders.map((o) => o.total).reduce((a, b) => a + b, 0);',
      'const t = sum(rows.map((r) => r.amount));',
      'const t = rows.map((r) => r.amount).sum;',
    ],
  };
  for (const [grupo, codigos] of Object.entries(marca)) {
    for (const codigo of codigos) {
      it(`marca (${grupo}): ${codigo.replace(/\n\s*/g, ' ')}`, () => expect(cuentasDePlata(codigo)).not.toEqual([]));
    }
  }

  const noMarca = [
    'formatCurrency(reservation.balanceDue)',
    'const pages = Math.ceil(total / pageSize);',
    'const pages = Math.ceil(data.total / PAGE_SIZE);',
    'const total = order.total_amount;',
    'const { total } = data;',
    '// const x = price * 2;',
    '/* total - deposit */',
    "const url = 'https://x.com/total/amount';",
    "const label = 'Total: ' + total;",
    'const label = `Saldo ${balance}`;',
    '<PaymentSurchargesCard />',
    '<Route path="cash" element={<CashBoxes />} />',
    'width: size.width * 0.8,',
    'return a.createdAt - b.createdAt;',
    'i++; j--;',
    'const ids = rows.map((r) => r.id);',
    'const n = rows.length - 1;',
    'const f = (x) => x.total;',
    'if (balance >= 0) return null;',
  ];
  for (const codigo of noMarca) {
    it(`no marca: ${codigo}`, () => expect(cuentasDePlata(codigo)).toEqual([]));
  }
});

describe('src/ no calcula precios, saldos, totales ni diferencias', () => {
  const hallazgos = archivosDeCodigo(join(process.cwd(), 'src')).flatMap((archivo) => {
    const ruta = relative(process.cwd(), archivo);
    return fragmentos(readFileSync(archivo, 'utf8')).map((fragmento) => ({ ruta, fragmento }));
  });

  /** Cada excepción cubre una aparición; lo que queda sin cubrir es una cuenta nueva. */
  const reparto = () => {
    const libres = [...EXCEPCIONES];
    const nuevas = hallazgos.filter((h) => {
      const i = libres.findIndex((e) => e.ruta === h.ruta && e.fragmento === h.fragmento);
      if (i === -1) return true;
      libres.splice(i, 1);
      return false;
    });
    return { nuevas, sobrantes: libres };
  };

  it('no hay cuentas de plata fuera de las excepciones', () => {
    expect(reparto().nuevas.map((h) => `${h.ruta}: «${h.fragmento}»`)).toEqual([]);
  });

  it('cada excepción sigue teniendo su cuenta: si ya no está, se saca de la lista', () => {
    expect(reparto().sobrantes.map((e) => `${e.ruta}: «${e.fragmento}»`)).toEqual([]);
  });

  it('una cuenta nueva en un archivo con excepciones sí se detecta', () => {
    const ruta = 'src/pages/Customers/CustomerDetails.tsx';
    const original = readFileSync(join(process.cwd(), ruta), 'utf8');
    const conCuentaNueva = `${original}\nexport const saldoNuevo = (a: number, deposit: number) => a - deposit;\n`;
    expect(fragmentos(conCuentaNueva).length).toBeGreaterThan(fragmentos(original).length);
  });
});
