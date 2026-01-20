import { TlRole } from "@/types/global";
import {
  Checkbox,
  CircularProgress,
  FormControl,
  FormHelperText,
  InputLabel,
  ListItemText,
  MenuItem,
  Select,
  SelectChangeEvent,
  Stack,
} from "@mui/material";
import React from "react";

interface SelectRoleListProps {
  roles: TlRole[];
  handleRoleChange: (roleIds: string[]) => void;
  selectedRoleIds?: string[];
  variant?: "standard" | "outlined" | "filled";
  margin?: "none" | "dense" | "normal";
  required?: boolean;
  error?: boolean;
  helperText?: string;
  loading?: boolean;
}

const SelectRoleList: React.FC<SelectRoleListProps> = ({
  roles,
  handleRoleChange,
  selectedRoleIds = [],
  variant = "outlined",
  margin = "normal",
  required = false,
  error = false,
  helperText,
  loading = false,
}) => {
  const handleChange = (e: SelectChangeEvent<string[]>) => {
    const value = e.target.value;
    handleRoleChange(Array.isArray(value) ? value : []);
  };

  const disabled = loading || !roles || roles.length === 0;

  return (
    <FormControl
      fullWidth
      variant={variant}
      margin={margin}
      required={required}
      error={error}
      disabled={disabled}
    >
      <InputLabel id="select-role-label">Роли</InputLabel>
      <Select
        labelId="select-role-label"
        id="select-role"
        multiple
        value={selectedRoleIds}
        label="Роли"
        onChange={handleChange}
        renderValue={(selected) =>
          roles
            .filter((item) => selected.includes(String(item.yt_dict_roles_id)))
            .map((item) => item.label)
            .join(", ")
        }
        sx={{ width: "auto" }}
      >
        {(roles ?? []).map((item) => {
          const value = String(item.yt_dict_roles_id);
          return (
            <MenuItem key={item.yt_dict_roles_id} value={value}>
              <Checkbox checked={selectedRoleIds.includes(value)} />
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

export default SelectRoleList;
