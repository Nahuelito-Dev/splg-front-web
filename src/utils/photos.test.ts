import { describe, expect, it } from 'vitest';
import { photoErrorMessage, photoFileError } from './photos';

const file = (type: string, bytes = 10) => new File([new Uint8Array(bytes)], 'f', { type });

describe('photoFileError', () => {
  it('acepta JPG, PNG y WEBP dentro del tamaño', () => {
    expect(photoFileError('car', file('image/jpeg'))).toBeNull();
    expect(photoFileError('car', file('image/png'))).toBeNull();
    expect(photoFileError('car', file('image/webp'))).toBeNull();
  });

  it('rechaza otros tipos', () => {
    expect(photoFileError('car', file('image/gif'))).toBe('La foto tiene que ser JPG, PNG o WEBP.');
    expect(photoFileError('car', file('application/pdf'))).toBe('La foto tiene que ser JPG, PNG o WEBP.');
  });

  it('el límite es de 5 MB, salvo el reclamo que admite 10 MB', () => {
    const six = file('image/png', 6 * 1024 * 1024);
    expect(photoFileError('gasCylinder', six)).toBe('La foto no puede superar los 5 MB.');
    expect(photoFileError('claim', six)).toBeNull();
    expect(photoFileError('claim', file('image/png', 11 * 1024 * 1024))).toBe('La foto no puede superar los 10 MB.');
  });
});

describe('photoErrorMessage', () => {
  it('muestra el mensaje del back cuando lo trae', () => {
    expect(photoErrorMessage('incident', 409, 'La incidencia no está abierta')).toBe('La incidencia no está abierta');
  });

  it('sin mensaje del back, explica el estado en castellano', () => {
    expect(photoErrorMessage('car', 413, 'Error 413')).toBe('La foto no puede superar los 5 MB.');
    expect(photoErrorMessage('claim', 413, 'Error 413')).toBe('La foto no puede superar los 10 MB.');
    expect(photoErrorMessage('car', 415, 'Error 415')).toContain('JPG, PNG o WEBP');
    expect(photoErrorMessage('incident', 409, 'Error 409')).toContain('ya no se puede cambiar');
    expect(photoErrorMessage('user', 403, 'Error 403')).toContain('No tenés permiso');
  });
});
