import { http, type Page, type PageParams, toQuery } from './httpClient';
import type {
  BajaDeProducto,
  Catalogo,
  CreateGasCylinderBody,
  GasCylinder,
  UpdateGasCylinderBody,
  UpdateStockBody,
} from './types';

/**
 * Catálogo de productos (`/gascylinder`): el TIPO de garrafa que vende la
 * distribuidora (10kg, 15kg…), con precio, stock y promociones. No confundir
 * con `/cylinders` (el envase físico serializado, en `physicalCylinders.ts`).
 */

/**
 * GET /gascylinder: el total viaja en el cuerpo (`CatalogoDto`), no en
 * `X-Total-Count`. `term` busca por tipo o descripción.
 */
export const listGasCylinders = async (params: PageParams, search?: string): Promise<Page<GasCylinder>> => {
  const { data } = await http.get<Catalogo>('/gascylinder', {
    params: { ...toQuery(params), term: search || undefined },
  });
  return { rows: data.gasCylinders, total: data.total };
};

/** GET /gascylinder/:id */
export const getGasCylinder = async (id: string): Promise<GasCylinder> => {
  const { data } = await http.get<GasCylinder>(`/gascylinder/${id}`);
  return data;
};

/** POST /gascylinder. El `type` es único por distribuidora (400 si se repite). */
export const createGasCylinder = async (body: CreateGasCylinderBody): Promise<GasCylinder> => {
  const { data } = await http.post<GasCylinder>('/gascylinder', body);
  return data;
};

/** PATCH /gascylinder/:id */
export const updateGasCylinder = async (id: string, body: UpdateGasCylinderBody): Promise<GasCylinder> => {
  const { data } = await http.patch<GasCylinder>(`/gascylinder/${id}`, body);
  return data;
};

/** PATCH /gascylinder/:id/stock: suma (positivo) o resta (negativo) unidades del stock actual. */
export const updateGasCylinderStock = async (id: string, body: UpdateStockBody): Promise<GasCylinder> => {
  const { data } = await http.patch<GasCylinder>(`/gascylinder/${id}/stock`, body);
  return data;
};

/** DELETE /gascylinder/:id: baja lógica (deja de listarse en la app). */
export const deleteGasCylinder = async (id: string): Promise<BajaDeProducto> => {
  const { data } = await http.delete<BajaDeProducto>(`/gascylinder/${id}`);
  return data;
};
