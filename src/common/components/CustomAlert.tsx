import { AlertTitle, Slide, SlideProps, Snackbar } from '@mui/material';
import Alert from '@mui/material/Alert';

import { useAppDispatch, useAppSelector } from '../../hooks';
import { closeAlert } from '../../store/ui';

function SlideTransition(props: SlideProps) {
  return <Slide {...props} direction="left" />;
}
interface Props {
  isOpen: boolean;
}
export const CustomAlert = ({ isOpen }: Props) => {
  const { message, title, severity, color } = useAppSelector((state: { ui: any; }) => state.ui);
  const dispatch = useAppDispatch()
  return (
    <Snackbar
      style={{ cursor: 'default'}}
      open={isOpen}
      onClose={() => dispatch(closeAlert())}
      TransitionComponent={SlideTransition}
      autoHideDuration={4000}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
    >
      <Alert sx={{ width: '100%', position: 'relative', zIndex: 10000001 }} severity={severity ?? 'error'} color={color ?? 'error'}>
        <AlertTitle>{title}</AlertTitle>
        {message}
      </Alert>
    </Snackbar>
  );
}

