import { confirm } from './notifications';

/**
 * Los formularios de página con cambios sin guardar se anotan acá (ver `useUnsavedChangesGuard`) para que también
 * lo sepan las acciones que no pasan por el router: cerrar sesión, «Ver como» y recargar la pestaña.
 */
const dirtyForms = new Set<symbol>();

export const setFormDirty = (id: symbol, dirty: boolean) => {
  if (dirty) dirtyForms.add(id);
  else dirtyForms.delete(id);
};

export const hasUnsavedChanges = () => dirtyForms.size > 0;

/**
 * Antes de una acción que descarta lo cargado: sin cambios sigue; con cambios pide confirmar con el `confirm()` del kit.
 * Si acepta, los formularios dejan de avisar (la acción ya está confirmada); si no, no se toca nada.
 */
export const confirmDiscardChanges = async (): Promise<boolean> => {
  if (!hasUnsavedChanges()) return true;
  const leave = await confirm({
    title: 'Hay cambios sin guardar',
    text: 'Si seguís se pierde lo que cargaste.',
    confirmText: 'Seguir sin guardar',
    danger: true,
  });
  if (leave) dirtyForms.clear();
  return leave;
};
