import { useEffect, useState } from 'react';
import {
  Box,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  Typography,
} from '@mui/material';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import { TrackedOrder } from '../types';

interface Props {
  trackedOrders: TrackedOrder[];
}

// "hace Xs" / "hace Xm" a partir de un ISO date.
const formatElapsed = (isoDate: string, now: number) => {
  const diffMs = now - new Date(isoDate).getTime();
  if (diffMs < 0 || Number.isNaN(diffMs)) return 'hace instantes';

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 5) return 'hace instantes';
  if (seconds < 60) return `hace ${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes}m`;

  const hours = Math.floor(minutes / 60);
  return `hace ${hours}h`;
};

export const TrackingList = ({ trackedOrders }: Props) => {
  // Reloj propio para que "hace Xs" se actualice aunque no llegue un evento
  // nuevo del socket.
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (trackedOrders.length === 0) {
    return (
      <Box
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          color: 'text.secondary',
          px: 3,
        }}
      >
        <MyLocationIcon sx={{ fontSize: 40, mb: 1, opacity: 0.4 }} />
        <Typography variant="subtitle1" fontWeight={700}>
          No hay entregas en curso
        </Typography>
        <Typography variant="body2">
          Cuando un chofer con un pedido asignado empiece a mandar su
          ubicación, va a aparecer acá y en el mapa.
        </Typography>
      </Box>
    );
  }

  return (
    <List disablePadding sx={{ height: '100%', overflowY: 'auto' }}>
      {trackedOrders.map((order, index) => (
        <Box key={order.orderId}>
          {index > 0 && <Divider component="li" />}
          <ListItem sx={{ py: 1.5, px: 2.5 }}>
            <ListItemText
              primary={
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1,
                  }}
                >
                  <Typography variant="subtitle2" fontWeight={700}>
                    Pedido #{order.orderId.slice(0, 8)}
                  </Typography>
                  <Chip
                    size="small"
                    color="success"
                    label={formatElapsed(order.at, now)}
                  />
                </Box>
              }
              secondary={
                <>
                  Chofer #{order.driverId.slice(0, 8)}
                  <br />
                  {order.lat.toFixed(5)}, {order.lng.toFixed(5)}
                </>
              }
            />
          </ListItem>
        </Box>
      ))}
    </List>
  );
};
