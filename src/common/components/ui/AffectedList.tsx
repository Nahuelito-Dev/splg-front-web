interface Props {
  items: string[];
  /** Cuántos se nombran; el resto se resume como "y N más". */
  max?: number;
  title?: string;
}

/** Qué filas va a afectar una acción en lote: las primeras por nombre y el resto como "y N más". */
export const AffectedList = ({ items, max = 5, title = 'Se van a afectar' }: Props) => {
  if (items.length === 0) return null;
  const shown = items.slice(0, max);
  const rest = items.length - shown.length;
  return (
    <div className="rounded-xl border border-outline bg-surface-hover p-3 text-sm">
      <p className="mb-1.5 text-xs font-semibold uppercase text-muted">
        {title} ({items.length})
      </p>
      <ul className="space-y-0.5 font-mono text-[13px] text-ink">
        {shown.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      {rest > 0 && <p className="mt-1 text-xs text-muted">y {rest} más</p>}
    </div>
  );
};
