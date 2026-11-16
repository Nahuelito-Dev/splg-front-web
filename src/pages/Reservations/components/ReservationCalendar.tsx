import { useMemo, useState } from 'react';
import type { Reserva } from '../../../services/api/types';
import { useTimeSlotAvailabilityByDay } from '../../../services/queries/timeSlots';
import { dayKey, groupByDay, shiftAnchor, visibleDays, type CalendarMode } from '../reservationCalendar';
import { ReservationCalendarToolbar } from './ReservationCalendarToolbar';
import { ReservationMonthView } from './ReservationMonthView';
import { ReservationTimeView } from './ReservationTimeView';

interface Props {
  rows: Reserva[];
  onOpen: (reservation: Reserva) => void;
}

/** Reservas en calendario (mes, semana, día); en semana y día suma los cupos de las franjas. */
export const ReservationCalendar = ({ rows, onOpen }: Props) => {
  const [mode, setMode] = useState<CalendarMode>('month');
  const [anchor, setAnchor] = useState(() => new Date());

  const byDay = useMemo(() => groupByDay(rows), [rows]);
  const slotDays = useMemo(() => (mode === 'month' ? [] : visibleDays(anchor, mode).map(dayKey)), [anchor, mode]);
  const { byDay: slotsByDay } = useTimeSlotAvailabilityByDay(slotDays, mode !== 'month');

  const pickDay = (day: Date) => {
    setAnchor(day);
    setMode('day');
  };

  return (
    <div>
      <ReservationCalendarToolbar
        anchor={anchor}
        mode={mode}
        onModeChange={setMode}
        onPrev={() => setAnchor(shiftAnchor(anchor, mode, -1))}
        onNext={() => setAnchor(shiftAnchor(anchor, mode, 1))}
        onToday={() => setAnchor(new Date())}
      />
      {mode === 'month' ? (
        <ReservationMonthView anchor={anchor} byDay={byDay} onOpen={onOpen} onPickDay={pickDay} />
      ) : (
        <ReservationTimeView
          mode={mode}
          anchor={anchor}
          byDay={byDay}
          slotsByDay={slotsByDay}
          onOpen={onOpen}
          onPickDay={pickDay}
        />
      )}
    </div>
  );
};
