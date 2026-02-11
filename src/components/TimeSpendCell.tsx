import AddIcon from "@mui/icons-material/Add";
import { Box, Chip, IconButton, Typography } from "@mui/material";
import { GridRenderCellParams } from "@mui/x-data-grid";
import { displayDuration } from "@/helpers";

interface TimeSpendCellProps {
  params: GridRenderCellParams;
  isEditable: boolean;
  isAddable: boolean;
  cellHasAllTags: (rowId: string | number, field: string) => boolean;
  onMenuOpen: (
    event: React.MouseEvent<HTMLElement>,
    params: GridRenderCellParams,
  ) => void;
  onInfoOpen: (
    event: React.MouseEvent<HTMLElement>,
    params: GridRenderCellParams,
  ) => void;
}

const TimeSpendCell = ({
  params,
  isEditable,
  isAddable,
  cellHasAllTags,
  onMenuOpen,
  onInfoOpen,
}: TimeSpendCellProps) => {
  const val = displayDuration(params.value);
  if (params.row.id === "total") return val;
  if (val === "" && isEditable && !isAddable) {
    return "";
  }
  if (val === "" && isEditable && isAddable) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          margin: "0 auto",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget.firstChild as HTMLElement).style.opacity = "1";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget.firstChild as HTMLElement).style.opacity = "0";
        }}
      >
        <IconButton
          sx={(theme) => ({
            opacity: 0,
            transition: "opacity 0.3s",
            color: theme.palette.primary.main,
            width: "100%",
            height: "100%",
          })}
        >
          <AddIcon />
        </IconButton>
      </div>
    );
  }

  if (val === "" && isEditable && !isAddable) {
    return <Typography variant="body2">{val}</Typography>;
  }

  const allTagged = cellHasAllTags(params.id, params.field);

  if (isEditable) {
    return (
      <Chip
        label={val}
        variant="outlined"
        clickable
        color={allTagged ? "success" : "error"}
        onClick={(e) => onMenuOpen(e, params)}
      />
    );
  }

  if (val === "") {
    return (
      <Typography
        variant="body2"
        sx={(theme) => ({
          color: allTagged ? theme.palette.success.main : theme.palette.error.main,
          fontWeight: 500,
        })}
      >
        {val}
      </Typography>
    );
  }

  return (
    <Box onClick={(e) => onInfoOpen(e, params)}>
      <Typography
        variant="button"
        sx={(theme) => ({
          color: allTagged ? theme.palette.success.main : theme.palette.error.main,
          fontWeight: 600,
        })}
      >
        {val}
      </Typography>
    </Box>
  );
};

export default TimeSpendCell;
