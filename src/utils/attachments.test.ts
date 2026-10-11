import { describe, expect, it } from 'vitest';
import { ATTACHMENT_MAX_BYTES, attachmentFileError } from './attachments';

const file = (type: string, size = 10) => new File([new Uint8Array(size)], 'a', { type });

describe('attachmentFileError', () => {
  it('acepta PDF e imágenes', () => {
    expect(attachmentFileError(file('application/pdf'))).toBeNull();
    expect(attachmentFileError(file('image/png'))).toBeNull();
  });
  it('rechaza otros tipos', () => {
    expect(attachmentFileError(file('text/plain'))).toMatch(/PDF, JPG, PNG o WEBP/);
  });
  it('rechaza lo que pasa de 10 MB', () => {
    expect(attachmentFileError(file('application/pdf', ATTACHMENT_MAX_BYTES + 1))).toMatch(/10 MB/);
  });
});
