import { Grid, Stack, Typography } from '@mui/material';
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
            sx={{ minHeight: '100vh', backgroundColor: color ? pallette.secondary.blackLike : '', padding: 4, }}
        >
            <Stack sx={{ marginBottom: '40px' }}>
                <MainMindLogo />
            </Stack>
            <Grid item
                xs={3}
                sx={{
                    width: { sm: 500 },
                    ...sx
                }}>
                {title !== '' ? <Typography className="text-center" variant='h4' sx={{ mb: 1 }}>{title}</Typography> : ''}

                {children}

            </Grid>
        </Grid>
    )
}
