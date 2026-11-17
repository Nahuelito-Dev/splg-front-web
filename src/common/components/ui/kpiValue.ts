/** «0», «$ 0», «0,00 %»: un valor con cifras y todas en cero (se muestra apagado). Un guion no es cero. */
export const isZeroValue = (value: string) => {
  const digits = value.replace(/\D/g, '');
  return digits.length > 0 && /^0+$/.test(digits);
};
