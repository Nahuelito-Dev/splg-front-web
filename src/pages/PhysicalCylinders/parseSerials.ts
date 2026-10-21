import { z } from 'zod';

/** Largo máximo del serial (`SERIAL_MAXIMO` del back). */
export const SERIAL_MAX = 100;

/** Forma canónica del serial, como la guarda el back: sin espacios en los bordes y en mayúsculas. */
export const normalizeSerial = (serial: string): string => serial.trim().toUpperCase();

/** Separa por comas, espacios o saltos de línea; descarta vacíos. */
export const parseSerials = (raw: string): string[] =>
  raw
    .split(/[\s,]+/)
    .map(normalizeSerial)
    .filter(Boolean);

/** Un serial: obligatorio, de hasta 100 caracteres y en mayúsculas (alta y edición del envase). */
export const serialSchema = z
  .string()
  .trim()
  .min(1, 'El serial es obligatorio')
  .max(SERIAL_MAX, `Máximo ${SERIAL_MAX} caracteres`)
  .transform(normalizeSerial);

/** Una lista de seriales escrita a mano (asignar a un pedido): al menos uno y cada uno de hasta 100 caracteres. */
export const serialListSchema = z
  .string()
  .trim()
  .min(1, 'Ingresá al menos un serial')
  .refine((raw) => parseSerials(raw).length > 0, 'Ingresá al menos un serial')
  .refine(
    (raw) => parseSerials(raw).every((serial) => serial.length <= SERIAL_MAX),
    `Cada serial tiene hasta ${SERIAL_MAX} caracteres`,
  );
