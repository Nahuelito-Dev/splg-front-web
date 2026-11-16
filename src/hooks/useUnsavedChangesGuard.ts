import { useEffect, useRef } from 'react';
import { unstable_useBlocker as useBlocker } from 'react-router-dom';
import { confirm, dismissConfirm } from '../utils/notifications';
import { hasUnsavedChanges, setFormDirty } from '../utils/unsavedChanges';

const CONFIRM_KEY = 'unsaved-changes';

/**
 * Avisa antes de perder lo que se está cargando en un formulario de página.
 *
 * Con cambios, cualquier salida del router (links, migas, menú, `navigate` y el botón «Atrás») se frena con
 * `useBlocker` y pide confirmación con `confirm()` del kit; recargar o cerrar la pestaña va con `beforeunload`.
 * Cerrar sesión y «Ver como» no pasan por el router: consultan `utils/unsavedChanges`, donde este hook se anota.
 *
 * Devuelve `release`: se llama al guardar, antes de navegar, para que la salida no pregunte.
 */
export const useUnsavedChangesGuard = (dirty: boolean) => {
  /** Se guardó: la salida ya no pregunta. */
  const saved = useRef(false);
  /** Se confirmó salir: lo que dura el paso por `proceeding`. */
  const leaving = useRef(false);
  /** Hay una confirmación abierta: una sola por formulario. */
  const asking = useRef(false);
  const mounted = useRef(true);
  const id = useRef(Symbol('form'));

  useEffect(() => {
    const formId = id.current;
    setFormDirty(formId, dirty);
    return () => setFormDirty(formId, false);
  }, [dirty]);

  const blocker = useBlocker(() => dirty && !saved.current && !leaving.current);
  const latest = useRef(blocker);
  latest.current = blocker;

  // Al desmontar (también por un cierre de sesión forzado) se cierra el aviso abierto y no queda nada pendiente.
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      saved.current = false;
      leaving.current = false;
      dismissConfirm(CONFIRM_KEY);
    };
  }, []);

  useEffect(() => {
    if (blocker.state === 'unblocked') leaving.current = false;
    if (blocker.state !== 'blocked' || asking.current) return;
    asking.current = true;
    void confirm({
      key: CONFIRM_KEY,
      title: 'Hay cambios sin guardar',
      text: 'Si salís ahora se pierde lo que cargaste.',
      confirmText: 'Salir sin guardar',
      danger: true,
    }).then((leave) => {
      asking.current = false;
      // Se resuelve contra el estado de AHORA del bloqueador: el que lo pidió pudo haberse reseteado o cambiado.
      const current = latest.current;
      if (!mounted.current || current.state !== 'blocked') return;
      if (leave) {
        leaving.current = true;
        setFormDirty(id.current, false);
        current.proceed();
      } else current.reset();
    });
  }, [blocker]);

  useEffect(() => {
    if (!dirty) return undefined;
    const warnOnUnload = (event: BeforeUnloadEvent) => {
      if (saved.current || leaving.current || !hasUnsavedChanges()) return;
      event.preventDefault();
    };
    window.addEventListener('beforeunload', warnOnUnload);
    return () => window.removeEventListener('beforeunload', warnOnUnload);
  }, [dirty]);

  return {
    release: () => {
      saved.current = true;
      setFormDirty(id.current, false);
    },
  };
};
