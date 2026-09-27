import type { DriverLocationPayload } from '../../hooks/useSocket';

export type { DriverLocationPayload };

// Última posición conocida de un pedido en curso. Por ahora coincide 1 a 1
// con el payload del socket, pero lo separamos por si más adelante sumamos
// campos derivados (ej. distancia recorrida, velocidad).
export type TrackedOrder = DriverLocationPayload;
