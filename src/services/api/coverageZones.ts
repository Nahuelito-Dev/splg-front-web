import { http, toPage, type Page } from './httpClient';
import type { CoverageCheck, CoverageZone } from './types';

/** GET /coverage-zones/check: parámetros de la verificación puntual. */
export interface CheckCoverageParams {
  lat: number;
  lng: number;
  /** Subtotal de garrafas: con él, la respuesta trae `amount` (recargo ya calculado). */
  subtotal?: number;
}

/**
 * `CreateCoverageZoneDto`/`UpdateCoverageZoneDto` (`CreateCoverageZoneBody`/
 * `UpdateCoverageZoneBody` en `types.ts`) marcan `surchargeType`,
 * `surchargeValue` y `priority` como obligatorios: en el DTO real del back son
 * opcionales (`@IsOptional()` con `@default`), pero `openapi-typescript` toma
 * cualquier propiedad con `default` en el swagger como siempre presente. Es un
 * defecto de la anotación Swagger del back, reportado en el informe: acá se
 * tipa el payload a mano en vez de mandar lo que salió mal generado.
 */
interface CoverageZoneFields {
  name?: string;
  polygon?: number[][];
  surchargeType?: 'fixed' | 'percentage';
  surchargeValue?: number;
  label?: string;
  color?: string;
  priority?: number;
  validFrom?: string;
  validUntil?: string;
  isActive?: boolean;
}

export interface CreateCoverageZonePayload extends CoverageZoneFields {
  name: string;
  /** Anillo del polígono como `[lng, lat][]` (orden GeoJSON), mínimo 3 vértices. */
  polygon: number[][];
}

export type UpdateCoverageZonePayload = CoverageZoneFields;

/** GET /coverage-zones?includeInactive: todas las zonas de la distribuidora (activas e inactivas). */
export const listCoverageZones = async (includeInactive = true): Promise<Page<CoverageZone>> => {
  const response = await http.get<CoverageZone[]>('/coverage-zones', { params: { includeInactive } });
  return toPage(response);
};

/** POST /coverage-zones */
export const createCoverageZone = async (body: CreateCoverageZonePayload): Promise<CoverageZone> => {
  const { data } = await http.post<CoverageZone>('/coverage-zones', body);
  return data;
};

/** PATCH /coverage-zones/:id */
export const updateCoverageZone = async (id: string, body: UpdateCoverageZonePayload): Promise<CoverageZone> => {
  const { data } = await http.patch<CoverageZone>(`/coverage-zones/${id}`, body);
  return data;
};

/** DELETE /coverage-zones/:id (baja lógica) */
export const deleteCoverageZone = async (id: string): Promise<void> => {
  await http.delete(`/coverage-zones/${id}`);
};

/** GET /coverage-zones/check?lat&lng&subtotal: qué zona gana en ese punto y cuánto recarga. */
export const checkCoverage = async ({ lat, lng, subtotal }: CheckCoverageParams): Promise<CoverageCheck> => {
  const { data } = await http.get<CoverageCheck>('/coverage-zones/check', { params: { lat, lng, subtotal } });
  return data;
};
