import { useEffect, useState } from 'react';

/** Un «ahora» que avanza cada minuto, para «hace 5m» sin redibujar en cada render. */
export const useMinuteClock = (): number => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
};
