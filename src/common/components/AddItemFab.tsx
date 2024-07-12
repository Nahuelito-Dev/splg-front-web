import AddIcon from '@mui/icons-material/Add';
import { Fab } from '@mui/material'

import palette from '../../theme/pallete';

interface Props {
    onClick: () => void
}

export const AddItemFab = ({ onClick }: Props) => {
    return (
      <Fab
        aria-label='add'
        sx={{
          backgroundColor: '#EB6123 !important',
          color: '#FFF',
          position: 'fixed',
          bottom: 40,
          right: 16,
        }}
        onClick={onClick}
        title='Add Membership'
      >
        <AddIcon />
      </Fab>
    );
}
