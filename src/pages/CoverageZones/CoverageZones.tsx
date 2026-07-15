import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MapContainer,
  TileLayer,
  Polygon,
  CircleMarker,
  useMapEvents,
} from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Swal from 'sweetalert2';

import {
  getCoverageZones,
  createCoverageZone,
  deleteCoverageZone,
  CoverageZone,
} from '../../services/api/coverageZones';

import MapIcon from '@mui/icons-material/Map';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

// Centro por defecto: misma zona de operación que usa el Tracking.
const DEFAULT_CENTER: LatLngExpression = [-26.82, -65.22];
const DEFAULT_ZOOM = 12;

const ZONE_COLORS = [
  '#4f46e5',
  '#059669',
  '#d97706',
  '#dc2626',
  '#7c3aed',
  '#0891b2',
];

// Convierte el anillo GeoJSON [lng,lat][] de una zona a posiciones Leaflet
// [lat,lng][] para renderizar el <Polygon>.
const toLatLng = (ring: number[][]): [number, number][] =>
  ring.map(([lng, lat]) => [lat, lng]);

// Captura clics en el mapa para ir agregando vértices mientras se dibuja.
const DrawCatcher = ({
  active,
  onAddPoint,
}: {
  active: boolean;
  onAddPoint: (point: [number, number]) => void;
}) => {
  useMapEvents({
    click(e) {
      if (active) onAddPoint([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
};

export const CoverageZones = () => {
  const queryClient = useQueryClient();

  const { data: zones = [], isLoading } = useQuery(
    ['coverageZones'],
    getCoverageZones,
  );

  // Estado del editor
  const [drawing, setDrawing] = useState(false);
  const [points, setPoints] = useState<[number, number][]>([]);
  const [name, setName] = useState('');
  const [surcharge, setSurcharge] = useState('0');

  const createMutation = useMutation({
    mutationFn: createCoverageZone,
    onSuccess: () => {
      queryClient.invalidateQueries(['coverageZones']);
      resetEditor();
      Swal.fire({
        title: 'Zona creada',
        icon: 'success',
        customClass: {
          confirmButton:
            'bg-indigo-600 text-white font-bold px-6 py-2 rounded-md hover:bg-indigo-700 transition-colors',
        },
        buttonsStyling: false,
      });
    },
    onError: () =>
      Swal.fire({
        title: 'Error',
        text: 'No se pudo crear la zona.',
        icon: 'error',
        customClass: {
          confirmButton:
            'bg-rose-600 text-white font-bold px-6 py-2 rounded-md hover:bg-rose-700 transition-colors',
        },
        buttonsStyling: false,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCoverageZone,
    onSuccess: () => queryClient.invalidateQueries(['coverageZones']),
    onError: () =>
      Swal.fire({ title: 'Error', text: 'No se pudo eliminar.', icon: 'error' }),
  });

  const resetEditor = () => {
    setDrawing(false);
    setPoints([]);
    setName('');
    setSurcharge('0');
  };

  const handleSave = () => {
    if (points.length < 3) return;
    // Leaflet usa [lat,lng]; el backend espera el anillo GeoJSON [lng,lat].
    const polygon = points.map(([lat, lng]) => [lng, lat]);
    createMutation.mutate({
      name: name.trim() || 'Zona sin nombre',
      polygon,
      surcharge: Number(surcharge) || 0,
    });
  };

  const handleDelete = async (zone: CoverageZone) => {
    const res = await Swal.fire({
      title: 'Eliminar zona',
      text: `¿Eliminar "${zone.name}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
      customClass: {
        confirmButton:
          'bg-rose-600 text-white font-bold px-6 py-2 rounded-md hover:bg-rose-700 transition-colors mr-2',
        cancelButton:
          'bg-slate-200 text-slate-700 font-bold px-6 py-2 rounded-md hover:bg-slate-300 transition-colors',
      },
      buttonsStyling: false,
    });
    if (res.isConfirmed) deleteMutation.mutate(zone.coverage_zone_id);
  };

  const existingPolygons = useMemo(
    () =>
      zones
        .filter((z) => z.area?.coordinates?.[0]?.length)
        .map((z, i) => ({
          zone: z,
          positions: toLatLng(z.area.coordinates[0]),
          color: ZONE_COLORS[i % ZONE_COLORS.length],
        })),
    [zones],
  );

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-[1600px] mx-auto">
        <header className="mb-6">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <MapIcon fontSize="large" className="text-slate-400" /> Zonas de
            cobertura
          </h1>
          <p className="text-slate-500 mt-1 ml-11">
            Definí las áreas donde la distribuidora entrega, con su recargo.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Mapa */}
          <section className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="h-[520px] w-full relative">
              <MapContainer
                center={DEFAULT_CENTER}
                zoom={DEFAULT_ZOOM}
                scrollWheelZoom
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <DrawCatcher
                  active={drawing}
                  onAddPoint={(p) => setPoints((prev) => [...prev, p])}
                />

                {/* Zonas existentes */}
                {existingPolygons.map(({ zone, positions, color }) => (
                  <Polygon
                    key={zone.coverage_zone_id}
                    positions={positions}
                    pathOptions={{ color, fillOpacity: 0.15 }}
                  />
                ))}

                {/* Dibujo en curso */}
                {points.length >= 2 && (
                  <Polygon
                    positions={points}
                    pathOptions={{
                      color: '#f43f5e',
                      dashArray: '6',
                      fillOpacity: 0.1,
                    }}
                  />
                )}
                {points.map((p, i) => (
                  <CircleMarker
                    key={i}
                    center={p}
                    radius={5}
                    pathOptions={{ color: '#f43f5e', fillOpacity: 1 }}
                  />
                ))}
              </MapContainer>

              {drawing && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-slate-900/80 text-white text-xs px-3 py-1.5 rounded-full">
                  Hacé clic en el mapa para marcar los vértices ·{' '}
                  {points.length} punto(s)
                </div>
              )}
            </div>
          </section>

          {/* Panel lateral */}
          <section className="space-y-6">
            {/* Editor */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
              <h3 className="font-bold text-slate-800 mb-3">Nueva zona</h3>

              {!drawing ? (
                <button
                  onClick={() => setDrawing(true)}
                  className="w-full bg-indigo-600 text-white font-bold py-2 rounded-md hover:bg-indigo-700 transition-colors"
                >
                  Dibujar en el mapa
                </button>
              ) : (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nombre de la zona"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">
                      Recargo ($)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={surcharge}
                      onChange={(e) => setSurcharge(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <p className="text-xs text-slate-500">
                    {points.length < 3
                      ? `Marcá al menos 3 puntos (${points.length}/3).`
                      : `${points.length} vértices. Listo para guardar.`}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPoints((p) => p.slice(0, -1))}
                      disabled={points.length === 0}
                      className="flex-1 bg-slate-100 text-slate-700 font-medium py-2 rounded-md hover:bg-slate-200 transition-colors disabled:opacity-50 text-sm"
                    >
                      Deshacer punto
                    </button>
                    <button
                      onClick={resetEditor}
                      className="flex-1 bg-slate-100 text-slate-700 font-medium py-2 rounded-md hover:bg-slate-200 transition-colors text-sm"
                    >
                      Cancelar
                    </button>
                  </div>
                  <button
                    onClick={handleSave}
                    disabled={points.length < 3 || createMutation.isLoading}
                    className="w-full bg-emerald-600 text-white font-bold py-2 rounded-md hover:bg-emerald-700 transition-colors disabled:opacity-50"
                  >
                    {createMutation.isLoading ? 'Guardando...' : 'Guardar zona'}
                  </button>
                </div>
              )}
            </div>

            {/* Lista de zonas */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
              <h3 className="font-bold text-slate-800 mb-3">
                Zonas activas ({zones.length})
              </h3>
              {isLoading ? (
                <p className="text-sm text-slate-400">Cargando...</p>
              ) : zones.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Todavía no hay zonas. Si no cargás ninguna, se entrega a todos
                  lados con recargo 0.
                </p>
              ) : (
                <ul className="space-y-2">
                  {existingPolygons.map(({ zone, color }) => (
                    <li
                      key={zone.coverage_zone_id}
                      className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-slate-50"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: color }}
                        />
                        <div className="min-w-0">
                          <p className="font-medium text-slate-800 truncate">
                            {zone.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            Recargo: ${Number(zone.surcharge).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(zone)}
                        className="text-rose-500 hover:text-rose-700 p-1 flex-shrink-0"
                        title="Eliminar zona"
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
