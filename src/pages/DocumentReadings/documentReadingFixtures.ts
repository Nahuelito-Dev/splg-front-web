import type { DocumentProposal, DocumentReading } from '../../services/api/types';

/** Una lectura propuesta de un comprobante de pago de cuota, para los tests. */
export const readingOf = (
  over: Partial<DocumentReading> = {},
  proposal: Partial<DocumentProposal> | null = {},
): DocumentReading => ({
  readingId: 'r-1',
  attachmentId: 'a-1',
  status: 'proposed',
  expectedType: 'comprobante_de_pago',
  detectedType: 'comprobante_de_pago',
  legible: true,
  fields: [
    { nombre: 'importe', valor: '38390.00', confianza: 'alta' },
    { nombre: 'fecha_de_pago', valor: '2026-11-01', confianza: 'alta' },
    { nombre: 'numero_de_operacion', valor: 'OP-77', confianza: 'media' },
    { nombre: 'destinatario', valor: 'La Segunda', confianza: 'alta' },
  ],
  warnings: [],
  duplicateOfId: null,
  model: 'claude-opus-5-5',
  costUsd: 0.0237,
  attempts: 1,
  lastError: null,
  proposal:
    proposal === null
      ? null
      : {
          action: 'pay_installment',
          ownerType: 'insurance_installment',
          ownerId: 'i-1',
          expected: { importe: '38390.00', destinatario: 'La Segunda Cooperativa' },
          read: { importe: '38390.00', destinatario: 'La Segunda' },
          differences: [],
          summary: 'Comprobante de cuota listo para confirmar.',
          ...proposal,
        },
  proposalExpiresAt: '2026-11-13T12:00:00.000Z',
  attemptedAt: '2026-11-11T12:00:00.000Z',
  decidedAt: null,
  decidedByUserId: null,
  decisionNote: null,
  corrections: null,
  executed: false,
  remindedAt: null,
  escalatedAt: null,
  reconciledAt: '2026-11-11T12:20:00.000Z',
  readAt: '2026-11-11T12:00:00.000Z',
  createdAt: '2026-11-11T11:59:00.000Z',
  attachment: {
    attachmentId: 'a-1',
    originalName: 'recibo-noviembre.pdf',
    mimeType: 'application/pdf',
    ownerType: 'insurance_installment',
    ownerId: 'i-1',
  },
  ...over,
});
