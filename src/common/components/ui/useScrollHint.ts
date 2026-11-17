import { useEffect, useRef, useState } from 'react';

/** Margen para no avisar por un píxel de redondeo. */
const SLACK = 1;

/**
 * ¿Queda contenido por ver más abajo (`y`) o más a la derecha (`x`)? Para dibujar el degradé que avisa que la zona se
 * desplaza. `pick` elige, dentro del elemento de la ref, el que de verdad se desplaza (p. ej. el de la grilla de MUI);
 * sin `pick`, es el mismo elemento. Se recalcula al desplazar, al cambiar el tamaño y al cambiar el contenido.
 */
export const useScrollHint = <T extends HTMLElement>(axis: 'x' | 'y', pick?: (root: T) => HTMLElement | null) => {
  // Ref de callback: el elemento puede aparecer después (la grilla se dibuja recién cuando hay filas).
  const [root, ref] = useState<T | null>(null);
  const pickRef = useRef(pick);
  pickRef.current = pick;
  const [more, setMore] = useState(false);

  useEffect(() => {
    if (!root) return undefined;
    const update = () => {
      const el = pickRef.current ? pickRef.current(root) : root;
      if (!el) {
        setMore(false);
        return;
      }
      const rest =
        axis === 'y'
          ? el.scrollHeight - el.clientHeight - el.scrollTop
          : el.scrollWidth - el.clientWidth - el.scrollLeft;
      setMore(rest > SLACK);
    };
    update();
    // El evento de desplazamiento no sube: se escucha en captura para enterarse también del de un hijo.
    root.addEventListener('scroll', update, { capture: true, passive: true });
    window.addEventListener('resize', update);
    const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    resize?.observe(root);
    const mutation = typeof MutationObserver === 'undefined' ? null : new MutationObserver(update);
    mutation?.observe(root, { childList: true, subtree: true });
    return () => {
      root.removeEventListener('scroll', update, { capture: true });
      window.removeEventListener('resize', update);
      resize?.disconnect();
      mutation?.disconnect();
    };
  }, [axis, root]);

  return { ref, more };
};
