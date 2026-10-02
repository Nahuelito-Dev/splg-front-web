import { describe, expect, it } from 'vitest';
import { FLEET_ATTACHMENT_MAX_BYTES, fleetAttachmentError } from './fleetAttachmentValidation';

const fileOf = (name: string, type: string, size: number): File => {
  const file = new File([new Uint8Array(size)], name, { type });
  return file;
};

describe('fleetAttachmentError', () => {
  it.each(['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])('acepta %s dentro del límite', (type) => {
    expect(fleetAttachmentError(fileOf('doc', type, 1024))).toBeNull();
  });

  it('rechaza un tipo no permitido', () => {
    expect(fleetAttachmentError(fileOf('doc.docx', 'application/msword', 1024))).not.toBeNull();
  });

  it('rechaza un archivo que supera los 10 MB', () => {
    expect(fleetAttachmentError(fileOf('doc.pdf', 'application/pdf', FLEET_ATTACHMENT_MAX_BYTES + 1))).not.toBeNull();
  });

  it('acepta justo en el límite', () => {
    expect(fleetAttachmentError(fileOf('doc.pdf', 'application/pdf', FLEET_ATTACHMENT_MAX_BYTES))).toBeNull();
  });
});
