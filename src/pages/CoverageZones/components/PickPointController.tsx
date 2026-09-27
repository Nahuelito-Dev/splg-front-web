import { useMapEvents } from 'react-leaflet';

interface Props {
  onPick: (point: { lat: number; lng: number }) => void;
}

/** Mientras está montado, un clic en el mapa reporta el punto (para "Probar un punto"). */
export const PickPointController = ({ onPick }: Props) => {
  useMapEvents({
    click: (event) => onPick({ lat: event.latlng.lat, lng: event.latlng.lng }),
  });
  return null;
};
