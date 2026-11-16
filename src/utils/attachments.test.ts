import { describe, expect, it } from 'vitest';
import { ATTACHMENT_MAX_BYTES, attachmentFileError, attachmentIsViewable } from './attachments';

const file = (type: string, size = 10, name = 'a') => new File([new Uint8Array(size)], name, { type });
const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

describe('attachmentFileError', () => {
  it('acepta PDF e imágenes', () => {
    expect(attachmentFileError(file('application/pdf'))).toBeNull();
    expect(attachmentFileError(file('image/png'))).toBeNull();
  });
  it('acepta Word, Excel y CSV por su tipo', () => {
    expect(attachmentFileError(file(DOCX))).toBeNull();
    expect(attachmentFileError(file(XLSX))).toBeNull();
    expect(attachmentFileError(file('text/csv'))).toBeNull();
  });
  it('acepta Word, Excel y CSV por la extensión cuando el navegador manda otro tipo o ninguno', () => {
    expect(attachmentFileError(file('', 10, 'informe.docx'))).toBeNull();
    expect(attachmentFileError(file('', 10, 'Planilla.XLSX'))).toBeNull();
    expect(attachmentFileError(file('application/vnd.ms-excel', 10, 'cobros.csv'))).toBeNull();
  });
  it('rechaza otros tipos, aunque se parezcan', () => {
    expect(attachmentFileError(file('text/plain', 10, 'a.txt'))).toMatch(/Word \(\.docx\), Excel \(\.xlsx\) o CSV/);
    expect(attachmentFileError(file('application/vnd.ms-excel', 10, 'viejo.xls'))).not.toBeNull();
    expect(attachmentFileError(file('', 10, 'macro.docm'))).not.toBeNull();
  });
  it('rechaza lo que pasa de 10 MB', () => {
    expect(attachmentFileError(file('application/pdf', ATTACHMENT_MAX_BYTES + 1))).toMatch(/10 MB/);
    expect(attachmentFileError(file(XLSX, ATTACHMENT_MAX_BYTES + 1, 'a.xlsx'))).toMatch(/10 MB/);
  });
});

describe('attachmentIsViewable', () => {
  it('sólo PDF e imágenes se ven en el navegador', () => {
    expect(attachmentIsViewable('application/pdf')).toBe(true);
    expect(attachmentIsViewable('image/webp')).toBe(true);
    expect(attachmentIsViewable(DOCX)).toBe(false);
    expect(attachmentIsViewable(XLSX)).toBe(false);
    expect(attachmentIsViewable('text/csv')).toBe(false);
  });
});
