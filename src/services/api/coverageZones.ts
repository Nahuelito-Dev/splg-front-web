import { privateAxiosInstance } from './axiosConfig';

export interface CoverageZone {
  coverage_zone_id: string;
  name: string;
  surcharge: number;
  isActive: boolean;
  // GeoJSON Polygon: coordinates[0] es el anillo como [lng, lat][].
  area: {
    type: 'Polygon';
    coordinates: number[][][];
  };
}

export interface CreateCoverageZonePayload {
  name: string;
  // Anillo del polígono como [lng, lat][] (orden GeoJSON).
  polygon: number[][];
  surcharge?: number;
  isActive?: boolean;
}

export const getCoverageZones = async () => {
  const { data } =
    await privateAxiosInstance.get<CoverageZone[]>('/coverage-zones');
  return data;
};

export const createCoverageZone = async (payload: CreateCoverageZonePayload) => {
  const { data } = await privateAxiosInstance.post('/coverage-zones', payload);
  return data;
};

export const deleteCoverageZone = async (id: string) => {
  const { data } = await privateAxiosInstance.delete(`/coverage-zones/${id}`);
  return data;
};
