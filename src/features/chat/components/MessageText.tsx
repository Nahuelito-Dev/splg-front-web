import { Fragment } from 'react';
import { splitMentions } from '../inbox/messageExtras';
import { splitLinks } from '../messageText';

interface Props {
  body: string;
  /** Los enlaces sobre la burbuja propia van con el color del texto de la burbuja. */
  onPrimary?: boolean;
  /** Nombres de las personas mencionadas en una nota interna: sus `@Nombre` se resaltan. */
  mentions?: readonly string[];
}

const Linked = ({ text, onPrimary }: { text: string; onPrimary: boolean }) => (
  <>
    {splitLinks(text).map((part, index) =>
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
  </>
);

/**
 * El cuerpo de un mensaje como texto plano: React lo escapa, así que un `<script>` se ve como texto. Los enlaces
 * `http(s)://` se detectan y abren en otra pestaña, sin darle acceso a la página que los abre; en una nota, las
 * menciones se resaltan.
 */
export const MessageText = ({ body, onPrimary = false, mentions }: Props) => (
  <span className="whitespace-pre-wrap break-words">
    {splitMentions(body, mentions ?? []).map((part, index) =>
      part.kind === 'mention' ? (
        <mark key={index} className="rounded bg-primary-soft px-0.5 font-semibold text-primary">
          {part.text}
        </mark>
      ) : (
        <Fragment key={index}>
          <Linked text={part.text} onPrimary={onPrimary} />
        </Fragment>
      ),
    )}
  </span>
);
