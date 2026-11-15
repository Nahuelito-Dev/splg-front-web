import { splitLinks } from '../messageText';

interface Props {
  body: string;
  /** Los enlaces sobre la burbuja propia van con el color del texto de la burbuja. */
  onPrimary?: boolean;
}

/**
 * El cuerpo de un mensaje como texto plano: React lo escapa, así que un `<script>` se ve como texto. Los enlaces
 * `http(s)://` se detectan y abren en otra pestaña, sin darle acceso a la página que los abre.
 */
export const MessageText = ({ body, onPrimary = false }: Props) => (
  <span className="whitespace-pre-wrap break-words">
    {splitLinks(body).map((part, index) =>
      part.kind === 'link' ? (
        <a
          // Los trozos son posiciones fijas del mismo texto: el índice es estable.
          key={index}
          href={part.href}
          target="_blank"
          rel="noopener noreferrer"
          className={onPrimary ? 'underline' : 'text-primary underline'}
        >
          {part.text}
        </a>
      ) : (
        <span key={index}>{part.text}</span>
      ),
    )}
  </span>
);
