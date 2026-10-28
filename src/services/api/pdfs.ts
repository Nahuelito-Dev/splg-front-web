import { env } from '../../config/env';
import { toApiErrorFromBlob } from './errors';
import { http } from './httpClient';

export interface PdfFile {
  blob: Blob;
  filename: string;
}

/** Qué PDF pedir: uno por endpoint de `src/pdf/pdf.controller.ts` del back. */
export type PdfRequest =
  | { kind: 'order-remito'; orderId: string }
  | { kind: 'order-recibo'; orderId: string }
  | { kind: 'settlement'; settlementId: string }
  | { kind: 'liquidation'; liquidationId: string }
  | { kind: 'cash-session'; sessionId: string }
  | { kind: 'sales'; from: string; to: string };

const fetchPdf = async (path: string, filename: string, params: Record<string, string> = {}): Promise<PdfFile> => {
  try {
    const response = await http.get<Blob>(path, {
      baseURL: env.apiUrlV2,
      params: { ...params, disposicion: 'inline' },
      responseType: 'blob',
    });
    return { blob: response.data, filename };
  } catch (error) {
    throw await toApiErrorFromBlob(error);
  }
};

/** El mismo código corto que usa el back en el nombre (`Content-Disposition` no se puede leer por CORS). */
const shortCode = (uuid: string) => uuid.replace(/-/g, '').slice(0, 8).toUpperCase();

/** GET /v2/orders/:id/remito.pdf */
export const downloadOrderRemito = (orderId: string) =>
  fetchPdf(`/orders/${orderId}/remito.pdf`, `remito-${shortCode(orderId)}.pdf`);

/** GET /v2/orders/:id/recibo.pdf: 409 si el pedido no está pagado o está cancelado. */
export const downloadOrderRecibo = (orderId: string) =>
  fetchPdf(`/orders/${orderId}/recibo.pdf`, `recibo-${shortCode(orderId)}.pdf`);

/** GET /v2/driver-settlements/:id/pdf */
export const downloadSettlementPdf = (settlementId: string) =>
  fetchPdf(`/driver-settlements/${settlementId}/pdf`, `rendicion-${shortCode(settlementId)}.pdf`);

/** GET /v2/driver-liquidations/:id/pdf */
export const downloadLiquidationPdf = (liquidationId: string) =>
  fetchPdf(`/driver-liquidations/${liquidationId}/pdf`, `liquidacion-${shortCode(liquidationId)}.pdf`);

/** GET /v2/cash-sessions/:id/pdf */
export const downloadCashSessionPdf = (sessionId: string) =>
  fetchPdf(`/cash-sessions/${sessionId}/pdf`, `cierre-caja-${shortCode(sessionId)}.pdf`);

/** GET /v2/reports/sales.pdf?desde&hasta (AAAA-MM-DD). */
export const downloadSalesPdf = (from: string, to: string) =>
  fetchPdf('/reports/sales.pdf', `ventas-${from}_${to}.pdf`, { desde: from, hasta: to });

export const downloadPdf = (request: PdfRequest): Promise<PdfFile> => {
  switch (request.kind) {
    case 'order-remito':
      return downloadOrderRemito(request.orderId);
    case 'order-recibo':
      return downloadOrderRecibo(request.orderId);
    case 'settlement':
      return downloadSettlementPdf(request.settlementId);
    case 'liquidation':
      return downloadLiquidationPdf(request.liquidationId);
    case 'cash-session':
      return downloadCashSessionPdf(request.sessionId);
    case 'sales':
      return downloadSalesPdf(request.from, request.to);
  }
};
