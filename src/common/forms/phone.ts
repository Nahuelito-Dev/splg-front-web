const E164 = /^\+[1-9]\d{7,14}$/;

/** Saca espacios, guiones, puntos y paréntesis y pasa un "00" inicial a "+": lo que se pega desde una agenda. */
export const normalizePhone = (raw: string): string => {
  const compact = raw.replace(/[\s().-]/g, '');
  return compact.startsWith('00') ? `+${compact.slice(2)}` : compact;
};

export const isE164 = (value: string): boolean => E164.test(value);
