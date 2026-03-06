import { alpha } from '@mui/material/styles';

// ==============================|| OVERRIDES - DATA GRID ||============================== //

export default function DataGrid(theme) {
  if (theme.palette.mode !== 'dark') {
    return {
      MuiDataGrid: {
        styleOverrides: {}
      }
    };
  }

  const thumb = alpha(theme.palette.grey[500], 0.45);
  const thumbHover = alpha(theme.palette.grey[400], 0.6);
  const track = alpha(theme.palette.common.white, 0.06);

  return {
    MuiDataGrid: {
      styleOverrides: {
        root: {
          colorScheme: 'dark',
          '& .MuiDataGrid-scrollbarFiller, & .MuiDataGrid-filler': {
            backgroundColor: track
          },
          '& .MuiDataGrid-virtualScroller': {
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': {
              width: 0,
              height: 0
            }
          },
          '& .MuiDataGrid-scrollbar, & .MuiDataGrid-scrollbar--vertical, & .MuiDataGrid-scrollbar--horizontal': {
            scrollbarWidth: 'thin',
            scrollbarColor: `${thumb} ${track}`,
            '&::-webkit-scrollbar': {
              width: 10,
              height: 10
            },
            '&::-webkit-scrollbar-track': {
              backgroundColor: track,
              borderRadius: 8
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: thumb,
              borderRadius: 8,
              border: `2px solid ${track}`,
              minHeight: 24
            },
            '&::-webkit-scrollbar-thumb:hover': {
              backgroundColor: thumbHover
            },
            '&::-webkit-scrollbar-corner': {
              backgroundColor: track
            }
          }
        }
      }
    }
  };
}
