// Payload que emite el backend por el gateway de admin cada vez que un chofer
// con un pedido en curso manda su posición GPS.
export interface DriverLocationPayload {
  orderId: string;
  driverId: string;
  lat: number;
  lng: number;
  at: string; // ISO date
}

// Última posición conocida de un pedido en curso. Por ahora coincide 1 a 1
// con el payload del socket, pero lo separamos por si más adelante sumamos
// campos derivados (ej. distancia recorrida, velocidad).
export type TrackedOrder = DriverLocationPayload;
