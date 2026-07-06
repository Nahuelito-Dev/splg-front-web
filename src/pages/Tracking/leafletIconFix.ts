import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Bug conocido de Leaflet + bundlers (Vite/Webpack): el ícono default arma
// la URL de los PNG con rutas relativas que el bundler no resuelve, así que
// el marker termina invisible/roto. Se arregla pisando el prototype una sola
// vez con las URLs ya resueltas por Vite (import de assets).
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })
  ._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});
