import { TlGroup } from "@/types/global";
import {
  Checkbox,
  FormControl,
  FormHelperText,
  InputLabel,
  ListItemText,
  MenuItem,
  Select,
  SelectChangeEvent,
  Stack,
  CircularProgress,
} from "@mui/material";
import React from "react";

interface SelectGroupListProps {
  groups: TlGroup[];
  handleGroupChange: (groupIds: string[]) => void;
  selectedGroupIds?: string[];
  variant?: "standard" | "outlined" | "filled";
  margin?: "none" | "dense" | "normal";
  required?: boolean;
  error?: boolean;
  helperText?: string;
  loading?: boolean;
}

const SelectGroupList: React.FC<SelectGroupListProps> = ({
  groups,
  handleGroupChange,
  selectedGroupIds = [],
  variant = "outlined",
  margin = "normal",
  required = false,
  error = false,
  helperText,
  loading = false,
}) => {
  const handleChange = (e: SelectChangeEvent<string[]>) => {
    const value = e.target.value;
    handleGroupChange(Array.isArray(value) ? value : []);
  };

  const disabled = loading || !groups || groups.length === 0;

  return (
    <FormControl
      fullWidth
      variant={variant}
      margin={margin}
      required={required}
      error={error}
      disabled={disabled}
    >
      <InputLabel id="select-group-label">Группы</InputLabel>
      <Select
        labelId="select-group-label"
        id="select-group"
        multiple
        value={selectedGroupIds}
        label="Группы"
        onChange={handleChange}
        renderValue={(selected) =>
          groups
            .filter((item) => selected.includes(String(item.yt_tl_group_id)))
            .map((item) => item.label)
            .join(", ")
        }
        sx={{ width: "auto" }}
      >
        {(groups ?? []).map((item) => {
          const value = String(item.yt_tl_group_id);
          return (
            <MenuItem key={item.yt_tl_group_id} value={value}>
              <Checkbox checked={selectedGroupIds.includes(value)} />
              <ListItemText primary={item.label} />
            </MenuItem>
          );
        })}
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

export default SelectGroupList;
