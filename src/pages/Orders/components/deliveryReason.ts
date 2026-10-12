export const DELIVERY_REASON_MIN = 10;
export const DELIVERY_REASON_MAX = 500;

export const deliveryReasonError = (reason: string): string | undefined => {
  const length = reason.trim().length;
  if (length < DELIVERY_REASON_MIN) return `Escribí al menos ${DELIVERY_REASON_MIN} caracteres`;
  if (length > DELIVERY_REASON_MAX) return `No puede superar ${DELIVERY_REASON_MAX} caracteres`;
  return undefined;
};

export const deliveryReasonCounter = (reason: string): string => `${reason.trim().length}/${DELIVERY_REASON_MAX}`;
