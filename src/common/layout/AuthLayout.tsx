import { Avatar, Box, Grid, Stack, Typography } from '@mui/material';
import pallette from '../../theme/pallete';
import { MainMindLogo } from '../../assets/images/MainMindLogo';

interface Props {
    children: JSX.Element | JSX.Element[];
    title?: string;
    color?: boolean;
    sx?: any;
}

export const AuthLayout = ({ children, title = '', color = true, sx }: Props) => {
    return (
      <Grid
        container
        spacing={0}
        direction="column"
        alignItems="center"
        justifyContent="center"
        sx={{
          minHeight: '100vh',
          backgroundColor: color ? pallette.secondary.blackLike : '',
          padding: 4,
        }}
      >
        <Box
          sx={{
            marginTop: 8,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginBottom: 4,
          }}
        >
          <img
            style={{ width: '100%' }}
            src="../gearth.png"
            alt="logo"
          />
        </Box>
        <Grid
          item
          xs={3}
          sx={{
            width: { sm: 500 },
            ...sx,
          }}
        >
          {title !== '' ? (
            <Typography className="text-center" variant="h4" sx={{ mb: 1 }}>
              {title}
            </Typography>
          ) : (
            ''
          )}

          {children}
        </Grid>
      </Grid>
    );
}
