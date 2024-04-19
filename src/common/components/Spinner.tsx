import { Grid } from '@mui/material';
import Box from '@mui/material/Box';
import CircularProgress, {
    circularProgressClasses
} from '@mui/material/CircularProgress';
import palette from '../../theme/pallete';

export const CheckingAuth = (props: any) => {
    return (
        <Grid
            container
            spacing={0}
            direction="column"
            alignItems="center"
            justifyContent="center"
            sx={{ minHeight: '100vh', backgroundColor: palette.secondary.blackLike, padding: 4 }}
        >
            <Box sx={{ position: 'relative' }}>
                <CircularProgress
                    sx={{
                        color: "#E2E1CD",
                    }}
                    size={40}
                    thickness={4}
                    {...props}
                    value={100}
                />
            </Box>
        </Grid>
    );
}

