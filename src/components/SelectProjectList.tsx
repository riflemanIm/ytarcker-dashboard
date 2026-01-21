import { getTlProjects } from "@/actions/data";
import { useAppContext } from "@/context/AppContext";
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
import React, { useEffect, useRef } from "react";

interface SelectProjectListProps {
  variant?: "standard" | "outlined" | "filled";
  margin?: "none" | "dense" | "normal";
  required?: boolean;
  error?: boolean;
  helperText?: string;
}

const SelectProjectList: React.FC<SelectProjectListProps> = ({
  variant = "outlined",
  margin = "normal",
  required = false,
  error = false,
  helperText,
}) => {
  const { tableTimePlanState, setTableTimePlanState } = useAppContext();
  const { projects, loadingProjects, selectedProjectIds } = tableTimePlanState;
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    let isMounted = true;
    if (projects.length > 0) return;
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    setTableTimePlanState((prev) => ({ ...prev, loadingProjects: true }));
    getTlProjects()
      .then((data) => {
        if (!isMounted) return;
        const sorted = [...data].sort(
          (a, b) => (a.sort_by ?? 0) - (b.sort_by ?? 0),
        );
        setTableTimePlanState((prev) => ({
          ...prev,
          projects: sorted,
          loadingProjects: false,
        }));
      })
      .catch((error) => {
        console.error("[SelectProjectList] getTlProjects error:", error.message);
        if (!isMounted) return;
        hasFetchedRef.current = false;
      })
      .finally(() => {
        setTableTimePlanState((prev) => ({ ...prev, loadingProjects: false }));
      });

    return () => {
      isMounted = false;
    };
  }, [setTableTimePlanState, projects.length]);

  const handleChange = (e: SelectChangeEvent<string[]>) => {
    const value = e.target.value;
    setTableTimePlanState((prev) => ({
      ...prev,
      selectedProjectIds: Array.isArray(value) ? value : [],
    }));
  };

  const disabled = loadingProjects || !projects || projects.length === 0;

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

      {loadingProjects ? (
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
