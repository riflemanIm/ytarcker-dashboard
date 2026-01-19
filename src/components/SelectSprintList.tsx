import { TlSprint } from "@/types/global";
import {
  Box,
  CircularProgress,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Stack,
  Typography,
} from "@mui/material";
import React from "react";

interface SelectSprintListProps {
  sprins: TlSprint[];
  handleSprintChange: (sprintId: string) => void;
  selectedSprintId?: string | null;
  variant?: "standard" | "outlined" | "filled";
  margin?: "none" | "dense" | "normal";
  required?: boolean;
  error?: boolean;
  helperText?: string;
  loading?: boolean;
}

const SelectSprintList: React.FC<SelectSprintListProps> = ({
  sprins,
  handleSprintChange,
  selectedSprintId = "",
  variant = "outlined",
  margin = "normal",
  required = false,
  error = false,
  helperText,
  loading = false,
}) => {
  const handleChange = (e: SelectChangeEvent<string>) => {
    handleSprintChange(e.target.value);
  };

  const disabled = loading || !sprins || sprins.length === 0;

  return (
    <FormControl
      fullWidth
      variant={variant}
      margin={margin}
      required={required}
      error={error}
      disabled={disabled}
    >
      <InputLabel id="select-sprint-label">Спринт</InputLabel>

      <Select
        labelId="select-sprint-label"
        id="select-sprint"
        value={selectedSprintId ?? ""}
        label="Спринт"
        onChange={handleChange}
        sx={{ width: "auto" }}
      >
        {(sprins ?? []).map((item) => (
          <MenuItem key={item.yt_tl_sprints_id} value={String(item.yt_tl_sprints_id)}>
            <Box sx={{ maxWidth: 380 }}>
              <Typography variant="body1" whiteSpace="wrap">
                {item.sprint}
              </Typography>
              {(item.current_sprint || item.archive) && (
                <Typography variant="body2" whiteSpace="wrap" color="secondary">
                  {item.current_sprint ? "Текущий" : "Архивный"}
                </Typography>
              )}
            </Box>
          </MenuItem>
        ))}
      </Select>

      {loading ? (
        <FormHelperText>
          <Stack direction="row" spacing={1} alignItems="center">
            <CircularProgress size={16} />
          </Stack>
        </FormHelperText>
      ) : helperText ? (
        <FormHelperText>{helperText}</FormHelperText>
      ) : null}
    </FormControl>
  );
};

export default SelectSprintList;
