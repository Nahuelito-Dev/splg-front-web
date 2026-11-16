import type { CashSession } from '../../services/api/types';

/**
 * El panel ofrece el cierre en PDF de las sesiones cerradas. El back también arma el arqueo de una
 * abierta (con el saldo del momento), que por ahora no se ofrece.
 */
export const canDownloadCashSessionPdf = (session: Pick<CashSession, 'status'>): boolean => session.status === 'closed';
