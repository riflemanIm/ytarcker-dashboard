import { getTlProjects } from "@/actions/data";
import { useAppContext } from "@/context/AppContext";
import {
  Checkbox,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import Autocomplete from "@mui/material/Autocomplete";
import ClearIcon from "@mui/icons-material/Clear";
import React, { useEffect, useRef } from "react";
import { TlProject } from "@/types/global";

interface AutocompleteProjectListProps {
  variant?: "standard" | "outlined" | "filled";
  margin?: "none" | "dense" | "normal";
  required?: boolean;
  error?: boolean;
  helperText?: string;
  disabled?: boolean;
}

const AutocompleteProjectList: React.FC<AutocompleteProjectListProps> = ({
  variant = "outlined",
  margin = "normal",
  required = false,
  error = false,
  helperText,
  disabled: forceDisabled = false,
}) => {
  const { state: appState, dispatch } = useAppContext();
  const { projects, projectsLoaded, loadingProjects, selectedProjectIds } =
    appState.tableTimePlanState;
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    let isMounted = true;
    if (forceDisabled) return;
    if (projectsLoaded || projects.length > 0) return;
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    dispatch({
      type: "setTableTimePlanState",
      payload: (prev) => ({ ...prev, loadingProjects: true }),
    });
    getTlProjects()
      .then((data) => {
        if (!isMounted) return;
        const sorted = [...data].sort(
          (a, b) => (a.sort_by ?? 0) - (b.sort_by ?? 0),
        );
        dispatch({
          type: "setTableTimePlanState",
          payload: (prev) => ({
            ...prev,
            projects: sorted,
            projectsLoaded: true,
            loadingProjects: false,
          }),
        });
      })
      .catch((error) => {
        console.error(
          "[AutocompleteProjectList] getTlProjects error:",
          error.message,
        );
        if (!isMounted) return;
        hasFetchedRef.current = false;
        dispatch({
          type: "setTableTimePlanState",
          payload: (prev) => ({ ...prev, projectsLoaded: false }),
        });
      })
      .finally(() => {
        dispatch({
          type: "setTableTimePlanState",
          payload: (prev) => ({ ...prev, loadingProjects: false }),
        });
      });

    return () => {
      isMounted = false;
    };
  }, [dispatch, forceDisabled, projects.length, projectsLoaded]);

  const handleChange = (
    event: React.SyntheticEvent,
    value: TlProject[],
  ) => {
    dispatch({
      type: "setTableTimePlanState",
      payload: (prev) => ({
        ...prev,
        selectedProjectIds: value.map((item) => String(item.projectId)),
      }),
    });
  };

  const disabled =
    forceDisabled || loadingProjects || !projects || projects.length === 0;
  const options = (projects || []).map((item) => item);
  const value = (projects || []).filter((item) =>
    selectedProjectIds.includes(String(item.projectId)),
  );

  return (
    <Autocomplete
      multiple
      disableCloseOnSelect
      blurOnSelect
      clearOnBlur
      autoSelect
      clearIcon={<ClearIcon fontSize="small" />}
      disabled={disabled}
      value={value}
      options={options}
      onChange={handleChange}
      getOptionLabel={(option: TlProject) => option?.ProjectName || ""}
      isOptionEqualToValue={(option: TlProject, value: TlProject) =>
        option.projectId === value.projectId
      }
      renderOption={(props, option: TlProject, { selected }) => (
        <li {...props}>
          <Checkbox checked={selected} />
          <Typography variant="body1">{option.ProjectName}</Typography>
        </li>
      )}
      noOptionsText={"Введите название проекта"}
      renderInput={(params) => (
        <TextField
          {...params}
          name="filter-projects"
          margin={margin}
          label={"Проекты"}
          fullWidth
          variant={variant}
          required={required}
          error={error}
          helperText={
            loadingProjects ? (
              <Stack direction="row" spacing={1} alignItems="center">
                <CircularProgress size={16} />
              </Stack>
            ) : (
              helperText
            )
          }
        />
      )}
    />
  );
};

export default AutocompleteProjectList;
