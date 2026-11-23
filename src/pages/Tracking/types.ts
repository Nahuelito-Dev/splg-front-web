import type { DriverLocationPayload } from '../../hooks/useSocket';

export type { DriverLocationPayload };

/** Última posición conocida de un pedido en curso, como llega por el socket. */
export type TrackedOrder = DriverLocationPayload;
