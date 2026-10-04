import { describe, expect, it } from 'vitest';
import { CLAIM_PHOTO_MAX_BYTES, claimPhotoError, claimPhotoUploadMessage } from './claimPhotoValidation';

const file = (type: string, size = 1000) => new File([new Uint8Array(size)], 'foto', { type });

describe('claimPhotoError', () => {
  it('acepta JPG, PNG y WEBP de hasta 10 MB', () => {
    for (const type of ['image/jpeg', 'image/png', 'image/webp']) expect(claimPhotoError(file(type))).toBeNull();
    expect(claimPhotoError(file('image/png', CLAIM_PHOTO_MAX_BYTES))).toBeNull();
  });

  it('rechaza otros tipos (un PDF o un GIF) y lo que pasa de 10 MB', () => {
    expect(claimPhotoError(file('application/pdf'))).toMatch(/JPG, PNG o WEBP/);
    expect(claimPhotoError(file('image/gif'))).toMatch(/JPG, PNG o WEBP/);
    expect(claimPhotoError(file('image/png', CLAIM_PHOTO_MAX_BYTES + 1))).toMatch(/10 MB/);
  });
});

describe('claimPhotoUploadMessage', () => {
  it('traduce 409, 413 y 415 y deja pasar el resto', () => {
    expect(claimPhotoUploadMessage(409, 'x')).toMatch(/cerrado/);
    expect(claimPhotoUploadMessage(413, 'x')).toMatch(/10 MB/);
    expect(claimPhotoUploadMessage(415, 'x')).toMatch(/JPG, PNG o WEBP/);
    expect(claimPhotoUploadMessage(500, 'falló')).toBe('falló');
  });
});
