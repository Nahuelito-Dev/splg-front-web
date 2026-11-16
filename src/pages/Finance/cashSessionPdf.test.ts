import { describe, expect, it } from 'vitest';
import { canDownloadCashSessionPdf } from './cashSessionPdf';

describe('canDownloadCashSessionPdf', () => {
  it('el cierre en PDF sólo existe para una sesión cerrada', () => {
    expect(canDownloadCashSessionPdf({ status: 'closed' })).toBe(true);
    expect(canDownloadCashSessionPdf({ status: 'open' })).toBe(false);
  });
});
