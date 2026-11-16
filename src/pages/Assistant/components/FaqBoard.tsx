import type { ReactNode } from 'react';
import { Card, EmptyState, FilterChips, SearchInput, Skeleton } from '../../../common/components/ui';
import { useUrlParam } from '../../../hooks';
import { filterFaqs } from '../faqRules';
import { FaqList } from './FaqList';

interface Item {
  id: string;
  position: number;
  question: string;
  answer: string;
  key?: string | null;
}

interface Props<T extends Item> {
  items: T[];
  /** El vacío de la base (sin ninguna pregunta), con su invitación. */
  empty: ReactNode;
  renderMeta?: (faq: T) => ReactNode;
  onEdit?: (faq: T) => void;
  onDelete?: (faq: T) => void;
}

/** Mientras carga: filas con la forma de las preguntas, no un spinner. */
export const FaqBoardSkeleton = () => (
  <Card>
    <div role="status" aria-label="Cargando preguntas frecuentes" className="divide-y divide-outline">
      <div className="p-4">
        <Skeleton className="h-9 w-72 max-w-full" />
      </div>
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="flex gap-4 px-5 py-4">
          <Skeleton className="h-7 w-7 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-5/6" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  </Card>
);

/** Buscador y lista de la base de conocimiento; la búsqueda queda en la URL (`?q=`). */
export const FaqBoard = <T extends Item>({ items, empty, renderMeta, onEdit, onDelete }: Props<T>) => {
  const [search, setSearch] = useUrlParam('q', '');
  if (items.length === 0) return <Card>{empty}</Card>;
  const shown = filterFaqs(items, search);
  return (
    <Card>
      <div className="flex flex-col gap-2 border-b border-outline p-4">
        <SearchInput
          label="Buscar en las preguntas frecuentes"
          placeholder="Buscar por pregunta, respuesta o clave"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="sm:w-96"
        />
        <FilterChips
          items={search.trim() ? [{ key: 'q', label: `"${search.trim()}"` }] : []}
          onRemove={() => setSearch('')}
          resultCount={shown.length}
        />
      </div>
      {shown.length === 0 ? (
        <EmptyState illustration="search" title="Sin resultados" description="Probá con otras palabras." />
      ) : (
        <FaqList items={shown} renderMeta={renderMeta} onEdit={onEdit} onDelete={onDelete} />
      )}
    </Card>
  );
};
