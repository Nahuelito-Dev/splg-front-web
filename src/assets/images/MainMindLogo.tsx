import { Box, Tooltip } from '@mui/material';

export const MainMindLogo = () => {
  return (
    <Box display="flex" alignItems="center">
      <Tooltip title="Gearthlogic">
        <img
          src="gearth.png"
          alt="gearth"
          style={{ height: 100, width: 'auto', marginRight: 8 }}
        />
      </Tooltip>
    </Box>
  );
};
