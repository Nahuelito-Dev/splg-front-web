import { idempotencyHeaders } from './idempotency';
import { http, type Page, type PageParams, toQuery } from './httpClient';
import type {
  BajaDeProducto,
  Catalogo,
  CreateGasCylinderBody,
  Disponibles,
  GasCylinder,
  UpdateGasCylinderBody,
  UpdateStockBody,
} from './types';

/*
 * F35: `container_price` (precio del envase) todavía no está en `openapi/splg-api.json`.
 * Se agrega a mano sobre los tipos generados hasta que el back lo publique: entonces se baja
 * `/docs-json`, se corre `npm run api:types` y estos tres alias se reemplazan por
 * `GasCylinder`, `CreateGasCylinderBody` y `UpdateGasCylinderBody`.
 */
/** Un producto del catálogo con su precio de envase (`null`: sin precio cargado). */
export type CatalogCylinder = GasCylinder;
/** Alta: `container_price` opcional (> 0, hasta 2 decimales) o `null`. */
export type CreateCatalogCylinderBody = CreateGasCylinderBody;
/** Edición: sin `container_price` no se toca; con `null` se borra. */
export type UpdateCatalogCylinderBody = UpdateGasCylinderBody;
type CatalogPage = Omit<Catalogo, 'gasCylinders'> & { gasCylinders: CatalogCylinder[] };
/** `GET /gascylinder/available/list` usa la misma respuesta por producto. */
export type AvailableCatalog = Omit<Disponibles, 'products'> & { products: CatalogCylinder[] };

/**
 * Catálogo de productos (`/gascylinder`): el TIPO de garrafa que vende la
 * distribuidora (10kg, 15kg…), con precio, stock y promociones. No confundir
 * con `/cylinders` (el envase físico serializado, en `physicalCylinders.ts`).
 */

/** Los parámetros de GET /gascylinder sin paginar: los mismos que usa el exporte completo. */
export const gasCylinderQuery = (search?: string) => ({ term: search || undefined });

/**
 * GET /gascylinder: el total viaja en el cuerpo (`CatalogoDto`), no en
 * `X-Total-Count`. `term` busca por tipo o descripción.
 */
export const listGasCylinders = async (params: PageParams, search?: string): Promise<Page<CatalogCylinder>> => {
  const { data } = await http.get<CatalogPage>('/gascylinder', {
    params: { ...toQuery(params), ...gasCylinderQuery(search) },
  });
  return { rows: data.gasCylinders, total: data.total };
};

/** GET /gascylinder/inactive: los productos dados de baja de la distribuidora (CU-269); mismo formato que el catálogo. */
export const listInactiveGasCylinders = async (params: PageParams, search?: string): Promise<Page<CatalogCylinder>> => {
  const { data } = await http.get<CatalogPage>('/gascylinder/inactive', {
    params: { ...toQuery(params), term: search || undefined },
  });
  return { rows: data.gasCylinders, total: data.total };
};

/** GET /gascylinder/:id */
export const getGasCylinder = async (id: string): Promise<CatalogCylinder> => {
  const { data } = await http.get<CatalogCylinder>(`/gascylinder/${id}`);
  return data;
};

/** GET /gascylinder/type/:type: el producto activo de ese tipo exacto (404 si no hay ninguno). */
export const getGasCylinderByType = async (type: string): Promise<CatalogCylinder> => {
  const { data } = await http.get<CatalogCylinder>(`/gascylinder/type/${encodeURIComponent(type)}`);
  return data;
};

/** GET /gascylinder/available/list: lo que la app del cliente puede pedir ahora (activo y con stock). */
export const getAvailableGasCylinders = async (): Promise<AvailableCatalog> => {
  const { data } = await http.get<AvailableCatalog>('/gascylinder/available/list');
  return data;
};

/** POST /gascylinder. El `type` es único por distribuidora (400 si se repite). */
export const createGasCylinder = async (body: CreateCatalogCylinderBody): Promise<CatalogCylinder> => {
  const { data } = await http.post<CatalogCylinder>('/gascylinder', body);
  return data;
};

/** PATCH /gascylinder/:id */
export const updateGasCylinder = async (id: string, body: UpdateCatalogCylinderBody): Promise<CatalogCylinder> => {
  const { data } = await http.patch<CatalogCylinder>(`/gascylinder/${id}`, body);
  return data;
};

/** PATCH /gascylinder/:id/stock: suma (positivo) o resta (negativo) unidades. La clave de idempotencia es obligatoria. */
export const updateGasCylinderStock = async (
  id: string,
  body: UpdateStockBody,
  key: string,
): Promise<CatalogCylinder> => {
  const { data } = await http.patch<CatalogCylinder>(`/gascylinder/${id}/stock`, body, {
    headers: idempotencyHeaders(key),
  });
  return data;
};

/** DELETE /gascylinder/:id: baja lógica (deja de listarse en la app). */
export const deleteGasCylinder = async (id: string): Promise<BajaDeProducto> => {
  const { data } = await http.delete<BajaDeProducto>(`/gascylinder/${id}`);
  return data;
};

/** PATCH /gascylinder/:id/reactivate: devuelve el producto al catálogo con su stock y promociones (CU-268). */
export const reactivateGasCylinder = async (id: string): Promise<CatalogCylinder> => {
  const { data } = await http.patch<CatalogCylinder>(`/gascylinder/${id}/reactivate`);
  return data;
};
