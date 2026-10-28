import { z } from 'zod';
import type { BankDetails, BankDetailsBody } from '../../services/api/types';

/** Mismas reglas que `BankDetailsDto` del back: alias de 6 a 20, titular de 2 a 120, CBU con sus dos dígitos verificadores. */
export const ALIAS_PATTERN = /^[A-Za-z0-9.-]{6,20}$/;
export const HOLDER_MIN = 2;
export const HOLDER_MAX = 120;

const CBU_BLOCK_1 = [7, 1, 3, 9, 7, 1, 3] as const;
const CBU_BLOCK_2 = [3, 9, 7, 1, 3, 9, 7, 1, 3, 9, 7, 1, 3] as const;

const checkDigit = (sum: number) => (10 - (sum % 10)) % 10;

/** CBU de 22 dígitos; el 8 y el 22 verifican el bloque de entidad y sucursal y el de la cuenta. */
export const isValidCbu = (cbu: string): boolean => {
  if (!/^[0-9]{22}$/.test(cbu)) return false;
  const d = [...cbu].map(Number);
  const sum1 = CBU_BLOCK_1.reduce((acc, weight, i) => acc + weight * d[i], 0);
  const sum2 = CBU_BLOCK_2.reduce((acc, weight, i) => acc + weight * d[8 + i], 0);
  return checkDigit(sum1) === d[7] && checkDigit(sum2) === d[21];
};

/** Un dato vacío es válido: queda sin cargar. */
const optional = (check: (value: string) => string | null) =>
  z
    .string()
    .trim()
    .superRefine((value, ctx) => {
      if (value === '') return;
      const message = check(value);
      if (message) ctx.addIssue({ code: z.ZodIssueCode.custom, message });
    });

export const bankDetailsSchema = z.object({
  cbu: optional((value) =>
    /^[0-9]{22}$/.test(value)
      ? isValidCbu(value)
        ? null
        : 'El CBU no es válido: revisá los dígitos'
      : 'El CBU tiene 22 dígitos, sin espacios ni guiones',
  ),
  alias: optional((value) =>
    ALIAS_PATTERN.test(value) ? null : 'El alias lleva de 6 a 20 caracteres: letras, números, punto y guion',
  ),
  holder: optional((value) =>
    value.length >= HOLDER_MIN && value.length <= HOLDER_MAX
      ? null
      : `El titular lleva de ${HOLDER_MIN} a ${HOLDER_MAX} caracteres`,
  ),
});

export type BankDetailsFormValues = z.infer<typeof bankDetailsSchema>;

export const bankDetailsValues = (details: BankDetails): BankDetailsFormValues => ({
  cbu: details.cbu ?? '',
  alias: details.alias ?? '',
  holder: details.holder ?? '',
});

/**
 * El PUT reemplaza los tres datos: lo vacío viaja como `null`. El OpenAPI declara estos campos `nullable` sin `type`
 * en el DTO de entrada y el generador los tipa como `Record<string, never>`; en el cable son `string | null`.
 */
const orNull = (value: string) => (value.trim() || null) as BankDetailsBody['cbu'];

export const toBankDetailsBody = (values: BankDetailsFormValues): BankDetailsBody => ({
  cbu: orNull(values.cbu),
  alias: orNull(values.alias),
  holder: orNull(values.holder),
});
