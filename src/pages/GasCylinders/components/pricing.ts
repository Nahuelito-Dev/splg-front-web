/** Precio final de una promoción por cantidad: `price` menos `percentage`% de descuento. */
export const discountedPrice = (price: number, percentage: number): number => price * (1 - percentage / 100);
