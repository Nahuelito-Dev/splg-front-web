import { useContext, useSyncExternalStore } from 'react';
import brand from './brand.json';
import { companyThemeStore } from './companyTheme';
import { BRASA_TOKENS } from './themeTokens';
import type { ResolvedThemeMode } from './themeMode';
import { ThemeModeContext } from './themeModeContextValue';

const { tinta, gas, llama, status, statusSoft, dark } = brand;

type Rule = google.maps.MapTypeStyle;

const hide = (featureType: string): Rule => ({ featureType, stylers: [{ visibility: 'off' }] });

/** Lo que no ayuda a repartir: comercios, transporte público y puntos de interés con su ícono. */
const QUIET: Rule[] = [
  hide('poi.business'),
  hide('poi.attraction'),
  hide('poi.place_of_worship'),
  hide('poi.sports_complex'),
  hide('transit'),
  { featureType: 'poi', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
];

interface Tones {
  land: string;
  landAlt: string;
  road: string;
  roadEdge: string;
  arterial: string;
  highway: string;
  highwayEdge: string;
  water: string;
  park: string;
  text: string;
  textHalo: string;
  textFaint: string;
  border: string;
}

const styles = (t: Tones): Rule[] => [
  { elementType: 'geometry', stylers: [{ color: t.land }] },
  { elementType: 'labels.text.fill', stylers: [{ color: t.text }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: t.textHalo }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: t.border }] },
  { featureType: 'administrative.land_parcel', elementType: 'labels.text.fill', stylers: [{ color: t.textFaint }] },
  { featureType: 'landscape.man_made', elementType: 'geometry', stylers: [{ color: t.landAlt }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: t.landAlt }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: t.textFaint }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: t.park }] },
  { featureType: 'road', elementType: 'geometry.fill', stylers: [{ color: t.road }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: t.roadEdge }] },
  { featureType: 'road.arterial', elementType: 'geometry.fill', stylers: [{ color: t.arterial }] },
  { featureType: 'road.highway', elementType: 'geometry.fill', stylers: [{ color: t.highway }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: t.highwayEdge }] },
  { featureType: 'road.local', elementType: 'labels.text.fill', stylers: [{ color: t.textFaint }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: t.water }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: t.textFaint }] },
  ...QUIET,
];

/** Brasa sobre Google Maps: el lienzo del panel, calles claras y las rutas con un toque del ámbar de marca. */
const LIGHT = styles({
  land: tinta['50'],
  landAlt: tinta['100'],
  road: tinta['25'],
  roadEdge: tinta['200'],
  arterial: tinta['25'],
  highway: gas['100'],
  highwayEdge: gas['200'],
  water: tinta['200'],
  park: statusSoft.success,
  text: tinta['600'],
  textHalo: tinta['25'],
  textFaint: tinta['500'],
  border: tinta['300'],
});

/** Brasa oscuro: las superficies del panel en modo oscuro, calles un escalón arriba y el agua azul profundo. */
const DARK = styles({
  land: dark.canvas,
  landAlt: dark.surface,
  road: dark.surfaceMuted,
  roadEdge: dark.outlineSoft,
  arterial: dark.outline,
  highway: dark.primarySoft,
  highwayEdge: llama['900'],
  water: dark.statusSoft.info,
  park: dark.statusSoft.success,
  text: dark.muted,
  textHalo: dark.canvas,
  textFaint: dark.faint,
  border: dark.outline,
});

export const MAP_STYLES: Record<ResolvedThemeMode, Rule[]> = { light: LIGHT, dark: DARK };

/**
 * Colores y estilo de los mapas según el tema. A diferencia de `useChartPalette` no exige el `ThemeModeProvider`
 * (sin él, claro): los mapas viven en modales y tarjetas que se prueban sueltos.
 */
export const useMapTheme = () => {
  const mode = useContext(ThemeModeContext)?.resolvedMode ?? 'light';
  const company = useSyncExternalStore(companyThemeStore.subscribe, companyThemeStore.getSnapshot);
  const tokens = company?.[mode] ?? BRASA_TOKENS[mode];
  const isDark = mode === 'dark';
  return {
    mode,
    styles: MAP_STYLES[mode],
    /** Fondo del mapa mientras cargan las teselas (el mismo del lienzo, para que no parpadee en blanco). */
    background: isDark ? dark.canvas : tinta['50'],
    /** Recorrido y paradas: el principal de la distribuidora (o el de Brasa). */
    primary: tokens.primary,
    /** Borde del recorrido, para que se lea sobre las calles. */
    halo: tokens.surface,
    ink: isDark ? dark.ink : tinta['900'],
    muted: isDark ? dark.muted : tinta['500'],
    info: isDark ? dark.status.info : status.info,
  };
};
