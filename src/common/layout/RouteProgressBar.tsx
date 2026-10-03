import { useEffect, useState } from 'react';

/**
 * Barra fina arriba del todo mientras carga una página (fallback del Suspense de
 * las rutas lazy): avanza rápido hasta ~80% y espera. Al montarse la página, desaparece.
 */
export const RouteProgressBar = () => {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setWidth(80));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div
      role="progressbar"
      aria-label="Cargando la página"
      aria-valuemin={0}
      aria-valuemax={100}
      className="pointer-events-none fixed inset-x-0 top-0 z-[1400] h-[3px]"
    >
      <div
        className="h-full rounded-r-full bg-gradient-to-r from-llama-400 to-llama-600 shadow-[0_0_8px] shadow-llama-500/60 transition-[width] duration-[2500ms] ease-out"
        style={{ width: `${width}%` }}
      />
    </div>
  );
};
