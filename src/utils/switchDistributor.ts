import { activeDistributor } from '../services/api/activeDistributor';
import { confirmDiscardChanges } from './unsavedChanges';

/**
 * «Ver como»: guarda la distribuidora activa y recarga el panel. Con cambios sin guardar se confirma ANTES de tocar
 * el contexto: si se cancela no se guarda nada. Devuelve `false` si se canceló.
 */
export const switchDistributor = async (slug: string | null): Promise<boolean> => {
  if (!(await confirmDiscardChanges())) return false;
  activeDistributor.set(slug);
  window.location.reload();
  return true;
};
