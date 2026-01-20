import { TlProject } from "@/types/global";
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

interface SelectProjectListProps {
  projects: TlProject[];
  handleProjectChange: (projectIds: string[]) => void;
  selectedProjectIds?: string[];
  variant?: "standard" | "outlined" | "filled";
  margin?: "none" | "dense" | "normal";
  required?: boolean;
  error?: boolean;
  helperText?: string;
  loading?: boolean;
}

const SelectProjectList: React.FC<SelectProjectListProps> = ({
  projects,
  handleProjectChange,
  selectedProjectIds = [],
  variant = "outlined",
  margin = "normal",
  required = false,
  error = false,
  helperText,
  loading = false,
}) => {
  const handleChange = (e: SelectChangeEvent<string[]>) => {
    const value = e.target.value;
    handleProjectChange(Array.isArray(value) ? value : []);
  };

  const disabled = loading || !projects || projects.length === 0;

  return (
    <FormControl
      fullWidth
      variant={variant}
      margin={margin}
      required={required}
      error={error}
      disabled={disabled}
    >
      <InputLabel id="select-project-label">Проекты</InputLabel>
      <Select
        labelId="select-project-label"
        id="select-project"
        multiple
        value={selectedProjectIds}
        label="Проекты"
        onChange={handleChange}
        renderValue={(selected) =>
          projects
            .filter((item) => selected.includes(String(item.projectId)))
            .map((item) => item.ProjectName)
            .join(", ")
        }
        sx={{ width: "auto" }}
      >
        {(projects ?? []).map((item) => {
          const value = String(item.projectId);
          return (
            <MenuItem key={item.projectId} value={value}>
              <Checkbox checked={selectedProjectIds.includes(value)} />
              <ListItemText primary={item.ProjectName} />
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

export default SelectProjectList;
