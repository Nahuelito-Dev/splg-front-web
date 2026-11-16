import ChevronLeft from '@mui/icons-material/ChevronLeft';
import ChevronRight from '@mui/icons-material/ChevronRight';
import { Button, CalendarKanbanViewToggle, IconButton } from '../../../common/components/ui';
import { calendarTitle, type CalendarMode } from '../reservationCalendar';

interface Props {
  anchor: Date;
  mode: CalendarMode;
  onModeChange: (mode: CalendarMode) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}

const MODES = [
  { id: 'month', label: 'Mes' },
  { id: 'week', label: 'Semana' },
  { id: 'day', label: 'Día' },
];

/** Navegación del calendario: anterior, siguiente, hoy y la escala (mes, semana o día). */
export const ReservationCalendarToolbar = ({ anchor, mode, onModeChange, onPrev, onNext, onToday }: Props) => (
  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline px-4 py-3">
    <div className="flex items-center gap-2">
      <IconButton label="Anterior" icon={<ChevronLeft />} onClick={onPrev} />
      <IconButton label="Siguiente" icon={<ChevronRight />} onClick={onNext} />
      <Button variant="secondary" size="sm" onClick={onToday}>
        Hoy
      </Button>
      <h2 aria-live="polite" className="ml-1 text-[15px] font-semibold text-ink">
        {calendarTitle(anchor, mode)}
      </h2>
    </div>
    <CalendarKanbanViewToggle
      label="Escala del calendario"
      options={MODES}
      value={mode}
      onChange={(id) => onModeChange(id as CalendarMode)}
    />
    <p className="flex w-full items-center gap-4 text-[11.5px] text-muted">
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm bg-success" />
        Seña paga
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm bg-warn" />
        Seña pendiente
      </span>
    </p>
  </div>
);
