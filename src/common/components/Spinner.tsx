import { LogoSplg } from '../../common/components/LogoSplg';

export const CheckingAuth = () => {
  return (
    // bg-side (no bg-ink): la pantalla de carga es parte de la marca, siempre oscura,
    // sin importar el tema elegido (ink cambia de claro a oscuro según el modo).
    <div className="flex min-h-screen w-full flex-col items-center justify-center gap-8 bg-side">
      <div className="animate-pulse">
        <LogoSplg size="lg" />
      </div>

      <div className="relative h-16 w-16" role="status" aria-label="Cargando">
        <div className="absolute inset-0 rounded-full border-4 border-tinta-800" />
        <div className="absolute inset-0 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>

      <p className="animate-pulse text-sm font-medium uppercase tracking-widest text-tinta-400">Cargando sistema...</p>
    </div>
  );
};
