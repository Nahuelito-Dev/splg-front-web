import { z } from 'zod';
import type { SaveMercadoPagoCredentialsBody } from '../../services/api/types';

/** Mismo tope que `SaveMercadoPagoCredentialsDto` del back. */
export const SECRET_MAX = 500;

const secret = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `Cargá ${label}`)
    .max(SECRET_MAX, `${label[0].toUpperCase()}${label.slice(1)} no puede pasar de ${SECRET_MAX} caracteres`);

export const mercadoPagoSchema = z.object({
  accessToken: secret('el access token'),
  publicKey: secret('la clave pública'),
  webhookSecret: secret('el secreto del webhook'),
});

export type MercadoPagoFormValues = z.infer<typeof mercadoPagoSchema>;

/** Nunca se precarga el valor guardado: el back sólo lo devuelve enmascarado. */
export const emptyMercadoPagoValues: MercadoPagoFormValues = { accessToken: '', publicKey: '', webhookSecret: '' };

export const toMercadoPagoBody = (values: MercadoPagoFormValues): SaveMercadoPagoCredentialsBody => ({
  accessToken: values.accessToken.trim(),
  publicKey: values.publicKey.trim(),
  webhookSecret: values.webhookSecret.trim(),
});
