/** El back rechaza (400) un ajuste que deje el stock en negativo. */
export const negativeStockMessage = (stock: number, quantity: number): string | undefined =>
  stock + quantity < 0 ? `Solo hay ${stock} unidades: no se pueden restar ${Math.abs(quantity)}` : undefined;
