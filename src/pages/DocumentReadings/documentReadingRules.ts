import type { DocumentProposal, DocumentReading, EmployeeDocuments } from '../../services/api/types';
import { argentinaDay, formatCurrencyExact, formatDateTime, formatDay } from '../../utils/format';

export type DocumentType = NonNullable<DocumentReading['detectedType']>;
type ProposalAction = DocumentProposal['action'];
type Task = EmployeeDocuments['tasks'][number];

export const DOCUMENT_TYPE_LABEL: Record<DocumentType, string> = {
  comprobante_de_pago: 'Comprobante de pago',
  factura_o_remito: 'Factura o remito',
  poliza: 'Póliza',
  revision_tecnica: 'Revisión técnica',
  cedula_del_vehiculo: 'Cédula del vehículo',
  licencia_de_conducir: 'Licencia de conducir',
  apto_medico: 'Apto médico',
  foto_de_patente: 'Foto de patente',
  otro: 'Otro',
};

export const DOCUMENT_TYPES = Object.keys(DOCUMENT_TYPE_LABEL) as DocumentType[];

/** El tipo que detectó el lector o, si no detectó, el que se esperaba por el dueño del adjunto. */
export const documentTypeOf = (reading: DocumentReading): DocumentType | null =>
  reading.detectedType ?? reading.expectedType;

export const documentTypeLabel = (reading: DocumentReading): string => {
  const type = documentTypeOf(reading);
  return type ? DOCUMENT_TYPE_LABEL[type] : 'Sin tipo';
};

/** El tipo de documento de la URL si es uno conocido; cualquier otro valor es «todos». */
export const typeParam = (value: string): DocumentType | '' => DOCUMENT_TYPES.find((t) => t === value) ?? '';

/** De qué registro es el adjunto (el dueño), en palabras. */
const OWNER_LABEL: Record<string, string> = {
  insurance_installment: 'Cuota de seguro',
  insurance_policy: 'Póliza de seguro',
  traffic_fine: 'Multa',
  traffic_fine_payment: 'Pago de multa',
  purchase_receipt: 'Recepción de compra',
  employee: 'Legajo',
  cash_movement: 'Movimiento de caja',
  customer_account_entry: 'Cuenta corriente',
  fuel_load: 'Carga de combustible',
  vehicle_accident: 'Siniestro',
};

export const ownerLabel = (ownerType: string | undefined): string => (ownerType && OWNER_LABEL[ownerType]) || 'Adjunto';

/**
 * Cómo se nombra una lectura en la lista: el archivo si la API lo trae (la ficha sí; el listado hoy no) y si no, lo que
 * propone hacer. Debajo, de qué registro es.
 */
export const readingTitle = (reading: DocumentReading): string =>
  reading.attachment?.originalName ?? (reading.proposal ? ACTION_TEXT[reading.proposal.action].title : 'Documento');

export const readingOwnerLabel = (reading: DocumentReading): string =>
  ownerLabel(reading.attachment?.ownerType ?? reading.proposal?.ownerType);

/** A dónde ir para ver el dueño, si el panel tiene una pantalla que lo abra por su id. */
export const ownerLink = (ownerType: string, ownerId: string): string | null => {
  const id = encodeURIComponent(ownerId);
  switch (ownerType) {
    case 'employee':
      return `/employees/details/${id}?tab=documents`;
    case 'purchase_receipt':
      return `/purchases/receipts/${id}`;
    case 'traffic_fine':
      return `/fleet/fines?fine=${id}`;
    default:
      return null;
  }
};

export const ACTION_TEXT: Record<ProposalAction, { title: string; impact: string }> = {
  pay_installment: {
    title: 'Pagar la cuota del seguro',
    impact:
      'Registra el pago de la cuota con el importe, la fecha y el número de operación del comprobante, y el egreso en la caja que elijas.',
  },
  pay_fine: {
    title: 'Pagar la multa',
    impact:
      'Registra el pago de la multa con el importe, la fecha y el número de operación del comprobante, y el egreso en la caja que elijas.',
  },
  update_policy: {
    title: 'Actualizar la póliza',
    impact: 'Escribe el número y la vigencia leídos en la póliza y recalcula su tarea de vencimiento.',
  },
  update_employee_document: {
    title: 'Renovar el documento del legajo',
    impact:
      'Da por hecha la tarea del documento con este archivo y deja la próxima venciendo en la fecha leída. Sin vencimiento leído, sólo cierra la propuesta.',
  },
  register_purchase_invoice: {
    title: 'Registrar la factura de la compra',
    impact: 'Registra la factura en la recepción con el número leído. El total no cambia: tiene que coincidir.',
  },
  review: {
    title: 'Revisar el documento',
    impact: 'No hay nada para aplicar: confirmar sólo cierra la propuesta.',
  },
};

/** Las acciones que registran un pago: piden la caja de la que sale. */
export const PAYMENT_ACTIONS: ReadonlySet<ProposalAction> = new Set(['pay_installment', 'pay_fine']);

/** Campos de cada tipo de documento, en el orden del lector (el back rechaza corregir un campo que no es del tipo). */
export const FIELDS_BY_TYPE: Record<DocumentType, string[]> = {
  comprobante_de_pago: [
    'importe',
    'fecha_de_pago',
    'numero_de_operacion',
    'destinatario',
    'cuit_del_destinatario',
    'periodo',
  ],
  factura_o_remito: ['numero', 'fecha', 'razon_social_del_emisor', 'cuit_del_emisor', 'total', 'iva', 'items'],
  poliza: ['aseguradora', 'numero_de_poliza', 'patente', 'vigencia_desde', 'vigencia_hasta', 'prima'],
  revision_tecnica: ['patente', 'fecha_de_revision', 'vencimiento', 'resultado'],
  cedula_del_vehiculo: ['patente', 'titular', 'marca', 'modelo', 'anio', 'vencimiento'],
  licencia_de_conducir: ['titular', 'documento', 'categoria', 'vencimiento'],
  apto_medico: ['titular', 'documento', 'fecha', 'vencimiento', 'resultado'],
  foto_de_patente: ['patente'],
  otro: [],
};

const FIELD_LABEL: Record<string, string> = {
  numero_de_operacion: 'Número de operación',
  cuit_del_destinatario: 'CUIT del destinatario',
  cuit_del_emisor: 'CUIT del emisor',
  razon_social_del_emisor: 'Razón social del emisor',
  numero: 'Número de comprobante',
  iva: 'IVA',
  items: 'Renglones',
  numero_de_poliza: 'Número de póliza',
  fecha_de_revision: 'Fecha de revisión',
  anio: 'Año',
  categoria: 'Categoría',
  periodo: 'Período',
};

/** «fecha_de_pago» → «Fecha de pago». */
export const fieldLabel = (name: string): string => {
  const text = FIELD_LABEL[name] ?? name.replace(/_/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
};

/** Fechas: se editan con el selector de día (el back compara una fecha sin hora con el día argentino de la leída). */
export const DATE_FIELDS: ReadonlySet<string> = new Set([
  'fecha',
  'fecha_de_pago',
  'vigencia_desde',
  'vigencia_hasta',
  'vencimiento',
  'fecha_de_revision',
]);

/** Importes: punto decimal y sin separador de miles, como los lee y los compara el back. */
export const MONEY_FIELDS: ReadonlySet<string> = new Set(['importe', 'total', 'iva', 'prima']);

/** Una diferencia en estos campos no se confirma: hay que corregir el dato (o aceptarlo repitiéndolo) o rechazar. */
const MUST_CORRECT: ReadonlySet<string> = new Set(['importe', 'fecha_de_pago', 'total']);

/** Lo que se leyó, por campo. */
export const readValues = (reading: DocumentReading): Record<string, string | null> =>
  Object.fromEntries(reading.fields.map((f) => [f.nombre, f.valor]));

/** Los campos a mostrar: los del tipo, más lo que trajeron la lectura y la propuesta, sin repetir. */
export const fieldNames = (reading: DocumentReading): string[] => {
  const type = documentTypeOf(reading);
  const names = [
    ...(type ? FIELDS_BY_TYPE[type] : []),
    ...reading.fields.map((f) => f.nombre),
    ...Object.keys(reading.proposal?.expected ?? {}),
  ];
  return [...new Set(names)];
};

/** Los campos que se pueden corregir: los del tipo de documento, salvo los renglones (texto JSON, no se editan acá). */
export const editableFields = (reading: DocumentReading): string[] => {
  const type = documentTypeOf(reading);
  return (type ? FIELDS_BY_TYPE[type] : []).filter((name) => name !== 'items');
};

const differs = (proposal: DocumentProposal, field: string) => proposal.differences.some((d) => d.field === field);

export interface DecisionState {
  /** La lectura tiene una propuesta abierta: se puede decidir. */
  open: boolean;
  /** Por qué no se puede confirmar tal cual (hay que corregir o rechazar). */
  confirmBlocked?: string;
  /** Por qué sólo queda rechazar: ni confirmar ni corregir sirven. */
  onlyReject?: string;
}

/**
 * Qué decisiones admite la propuesta, con las mismas reglas que el back: así el botón explica por qué no se puede en
 * vez de esperar el 400. El back igual valida todo.
 */
/** El día del pago: un día suelto tal cual; un instante, su día en Buenos Aires (como compara el back). */
const diaDelPago = (value: string): string => (/^\d{4}-\d{2}-\d{2}$/.test(value) ? value : argentinaDay(value));

export const decisionState = (reading: DocumentReading, now: Date = new Date()): DecisionState => {
  const proposal = reading.proposal;
  if (reading.status !== 'proposed' || !proposal) return { open: false };
  const read = readValues(reading);

  if (proposal.action === 'update_policy' && differs(proposal, 'patente')) {
    return {
      open: true,
      onlyReject: 'La patente leída no coincide con el vehículo: sólo queda rechazar la propuesta.',
    };
  }
  if (proposal.action === 'update_employee_document') {
    if (/^no\s*apto$/i.test(read.resultado?.trim() ?? '')) {
      return {
        open: true,
        onlyReject: 'El certificado dice «no apto» y no renueva el documento: rechazá la propuesta.',
      };
    }
    if (differs(proposal, 'documento')) {
      return {
        open: true,
        onlyReject: 'El documento leído no coincide con el legajo: sólo queda rechazar la propuesta.',
      };
    }
  }

  const mustCorrect = proposal.differences.find((d) => MUST_CORRECT.has(d.field));
  if (mustCorrect) {
    return {
      open: true,
      confirmBlocked: `Hay diferencias en ${fieldLabel(mustCorrect.field).toLowerCase()}: corregí el dato o rechazá la propuesta.`,
    };
  }
  if (PAYMENT_ACTIONS.has(proposal.action) && (!read.importe || !read.fecha_de_pago)) {
    return { open: true, confirmBlocked: 'Falta el importe o la fecha del pago: corregilos para confirmar.' };
  }
  if (
    PAYMENT_ACTIONS.has(proposal.action) &&
    read.fecha_de_pago &&
    diaDelPago(read.fecha_de_pago) > argentinaDay(now)
  ) {
    return { open: true, confirmBlocked: 'La fecha del pago es posterior a hoy: corregila o rechazá la propuesta.' };
  }
  if (proposal.action === 'update_policy' && (!read.numero_de_poliza || !read.vigencia_desde || !read.vigencia_hasta)) {
    return { open: true, confirmBlocked: 'Faltan el número o las fechas de vigencia: corregilos para confirmar.' };
  }
  if (proposal.action === 'register_purchase_invoice' && !read.numero) {
    return { open: true, confirmBlocked: 'Falta el número de la factura: corregilo para confirmar.' };
  }
  return { open: true };
};

/** Qué documento renueva un legajo según el tipo leído (la misma regla del back). */
export const documentKindOf = (reading: DocumentReading): 'psychophysical' | 'driver_license' =>
  reading.detectedType === 'apto_medico' ? 'psychophysical' : 'driver_license';

const CLOSED: ReadonlySet<Task['status']> = new Set(['done', 'cancelled']);

/** Las tareas abiertas del legajo que esta lectura podría renovar. */
export const renewableTasks = (reading: DocumentReading, tasks: Task[]): Task[] => {
  const kind = documentKindOf(reading);
  return tasks.filter((t) => !CLOSED.has(t.status) && t.plan?.documentKind === kind);
};

/** Si confirmar esta propuesta renueva una tarea del legajo (hay vencimiento leído o corregido). */
export const renewsTask = (reading: DocumentReading, values: Record<string, string | null> = readValues(reading)) =>
  reading.proposal?.action === 'update_employee_document' && Boolean(values.vencimiento);

/** El valor inicial de un campo en el formulario de corrección (una fecha con hora pasa al día de Buenos Aires). */
export const initialValue = (name: string, read: string | null | undefined): string => {
  if (!read) return '';
  if (!DATE_FIELDS.has(name)) return read;
  if (!/^\d{4}-\d{2}-\d{2}/.test(read)) return '';
  if (read.length === 10) return read;
  const instant = new Date(read);
  return Number.isNaN(instant.getTime()) ? read.slice(0, 10) : argentinaDay(instant);
};

/**
 * Los campos corregidos que se mandan: los que cambiaron respecto de lo leído y, aunque no cambien, los que tienen
 * una diferencia que exige corregir (repetir el valor leído es aceptarlo, p. ej. pagar una cuota con recargo).
 */
export const correctedFields = (reading: DocumentReading, values: Record<string, string>): Record<string, string> => {
  const read = readValues(reading);
  const differences = reading.proposal?.differences ?? [];
  const out: Record<string, string> = {};
  for (const [name, raw] of Object.entries(values)) {
    const value = raw.trim();
    if (!value) continue;
    const accepted = MUST_CORRECT.has(name) && differences.some((d) => d.field === name);
    if (accepted || value !== initialValue(name, read[name])) out[name] = value;
  }
  return out;
};

/** Los campos con una diferencia que exige corregir: en el formulario son obligatorios. */
export const requiredFields = (reading: DocumentReading): string[] =>
  (reading.proposal?.differences ?? []).filter((d) => MUST_CORRECT.has(d.field)).map((d) => d.field);

/** Cuántos documentos leería la corrida, en una frase. */
export const simulationText = (read: number, budgetReached: number): string => {
  if (read === 0) {
    return budgetReached > 0
      ? 'El tope de gasto del mes no deja leer ningún documento más.'
      : 'No hay documentos pendientes de leer.';
  }
  const docs = `${read} ${read === 1 ? 'documento' : 'documentos'}`;
  return budgetReached > 0
    ? `Se leerían ${docs}: el tope de gasto del mes no alcanza para todos los pendientes.`
    : `Se leerían ${docs}.`;
};

/** El resultado de una corrida real, en una frase. */
export const runSummary = (run: {
  read: number;
  duplicates: number;
  failed: number;
  budgetReached: number;
}): string => {
  const parts = [`${run.read} ${run.read === 1 ? 'leído' : 'leídos'}`];
  if (run.duplicates > 0) parts.push(`${run.duplicates} ${run.duplicates === 1 ? 'duplicado' : 'duplicados'}`);
  if (run.failed > 0) parts.push(`${run.failed} con error`);
  const text = parts.join(', ');
  return run.budgetReached > 0 ? `${text}. Se alcanzó el tope de gasto del mes.` : `${text}.`;
};

/** Cuánto del tope mensual se fue, de 0 a 100 (sin tope configurado, nada). */
export const spentPercent = (spent: number, budget: number | null): number | null =>
  budget === null || budget <= 0 ? null : Math.min(100, Math.round((spent / budget) * 100));

const INSTANTE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
const DIA = /^\d{4}-\d{2}-\d{2}$/;
const CAMPOS_DE_IMPORTE: ReadonlySet<string> = new Set(['importe', 'total']);
const IMPORTE = /^-?\d+(\.\d+)?$/;

/** El valor como lo lee una persona: fechas en castellano e importes en pesos. Lo demás, tal cual. */
export const displayValue = (name: string, value: string | null | undefined): string => {
  if (value === null || value === undefined || value === '') return '—';
  if (INSTANTE.test(value)) return formatDateTime(value);
  if (DIA.test(value)) return formatDay(value);
  if (CAMPOS_DE_IMPORTE.has(name) && IMPORTE.test(value)) return formatCurrencyExact(value);
  return value;
};
