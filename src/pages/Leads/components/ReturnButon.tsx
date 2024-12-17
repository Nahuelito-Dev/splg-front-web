import { useNavigate } from 'react-router-dom';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import { IconButton } from '@mui/material';

export const ReturnButon = () => {
  const navigate = useNavigate();
  return (
    <IconButton onClick={() => navigate(-1)} size="medium">
      {' '}
      <ChevronLeftIcon fontSize="medium" />
    </IconButton>
  );
};
