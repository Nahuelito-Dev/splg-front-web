import type { FileSource } from '../services/api/fileSource';

const clickLink = (href: string, attrs: { download?: string; newTab?: boolean }) => {
  const link = document.createElement('a');
  link.href = href;
  if (attrs.download !== undefined) link.download = attrs.download;
  if (attrs.newTab) {
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  }
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/** Abre el archivo en una pestaña nueva. Devuelve `false` si el navegador bloqueó la ventana. */
export const openFileSource = (source: FileSource): boolean => {
  if (source.kind === 'url') {
    // Un enlace con `noopener` no devuelve la ventana (`window.open` daría siempre null): no hay forma de saber si se
    // bloqueó, y un bloqueo de popups no corta un clic hecho por el usuario.
    clickLink(source.url, { newTab: true });
    return true;
  }
  const url = URL.createObjectURL(source.blob);
  const win = window.open(url, '_blank');
  // No se revoca al toque: la pestaña nueva todavía tiene que cargar el blob.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return win !== null;
};

/** Baja el archivo con su nombre original. */
export const saveFileSource = (source: FileSource, filename: string) => {
  if (source.kind === 'url') {
    // Con una URL de otro origen el atributo `download` no se respeta: el nombre lo fija el back en la firma.
    clickLink(source.url, { download: filename, newTab: true });
    return;
  }
  const url = URL.createObjectURL(source.blob);
  clickLink(url, { download: filename });
  URL.revokeObjectURL(url);
};
