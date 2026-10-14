import type { User } from '../../services/api/types';

/**
 * El personal de una distribuidora (chofer o admin de empresa). Sobre su cuenta el administrador general necesita
 * una distribuidora elegida («Ver como»): sin `X-Distributor` la API contesta 400. Un cliente (compra en varias
 * empresas) u otro administrador general se administran sin ella.
 */
export const isDistributorStaff = (user: Pick<User, 'role'>): boolean =>
  user.role?.type === 'admin' || user.role?.type === 'delivery';
