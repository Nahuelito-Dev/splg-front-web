/** Prefijos de CUIT: personas humanas (20, 23, 24, 27) y jurídicas (30, 33, 34). */
const VALID_PREFIXES = ['20', '23', '24', '27', '30', '33', '34'];
const FACTORS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];

/** Deja sólo los dígitos: acepta `30-71234567-1` y `30 71234567 1`. */
export const normalizeCuit = (value: string): string => value.replace(/[-\s]/g, '');

/** ¿Es un CUIT bien formado? Once dígitos, prefijo válido y dígito verificador módulo 11 (igual que la API). */
export const isValidCuit = (cuit: string): boolean => {
  if (!/^\d{11}$/.test(cuit)) return false;
  if (!VALID_PREFIXES.includes(cuit.slice(0, 2))) return false;
  const sum = FACTORS.reduce((acc, factor, i) => acc + factor * Number(cuit[i]), 0);
  const rest = sum % 11;
  const check = rest === 0 ? 0 : 11 - rest;
  return check < 10 && check === Number(cuit[10]);
};

/** 30-71234567-1 */
export const formatCuit = (cuit: string): string =>
  /^\d{11}$/.test(cuit) ? `${cuit.slice(0, 2)}-${cuit.slice(2, 10)}-${cuit.slice(10)}` : cuit;
