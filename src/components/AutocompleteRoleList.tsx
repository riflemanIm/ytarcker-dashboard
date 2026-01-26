import { getTlRoles } from "@/actions/data";
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

interface AutocompleteRoleListProps {
  variant?: "standard" | "outlined" | "filled";
  margin?: "none" | "dense" | "normal";
  required?: boolean;
  error?: boolean;
  helperText?: string;
}

const AutocompleteRoleList: React.FC<AutocompleteRoleListProps> = ({
  variant = "outlined",
  margin = "normal",
  required = false,
  error = false,
  helperText,
}) => {
  const { state: appState, dispatch } = useAppContext();
  const { roles, rolesLoaded, loadingRoles, selectedRoleIds } =
    appState.tableTimePlanState;
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    let isMounted = true;
    if (rolesLoaded || roles.length > 0) return;
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    dispatch({
      type: "setTableTimePlanState",
      payload: (prev) => ({ ...prev, loadingRoles: true }),
    });
    getTlRoles()
      .then((data) => {
        if (!isMounted) return;
        const sorted = [...data].sort(
          (a, b) => (a.sort_by ?? 0) - (b.sort_by ?? 0),
        );
        dispatch({
          type: "setTableTimePlanState",
          payload: (prev) => ({
            ...prev,
            roles: sorted,
            rolesLoaded: true,
            loadingRoles: false,
          }),
        });
      })
      .catch((error) => {
        console.error(
          "[AutocompleteRoleList] getTlRoles error:",
          error.message,
        );
        if (!isMounted) return;
        hasFetchedRef.current = false;
        dispatch({
          type: "setTableTimePlanState",
          payload: (prev) => ({ ...prev, rolesLoaded: false }),
        });
      })
      .finally(() => {
        dispatch({
          type: "setTableTimePlanState",
          payload: (prev) => ({ ...prev, loadingRoles: false }),
        });
      });

    return () => {
      isMounted = false;
    };
  }, [dispatch, roles.length, rolesLoaded]);

  const handleChange = (
    event: React.SyntheticEvent,
    value: { yt_dict_roles_id: number; label: string }[],
  ) => {
    dispatch({
      type: "setTableTimePlanState",
      payload: (prev) => ({
        ...prev,
        selectedRoleIds: value.map((item) =>
          String(item.yt_dict_roles_id),
        ),
      }),
    });
  };

  const disabled = loadingRoles || !roles || roles.length === 0;
  const options = (roles || []).map((item) => item);
  const value = (roles || []).filter((item) =>
    selectedRoleIds.includes(String(item.yt_dict_roles_id)),
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
      getOptionLabel={(option) => option?.label || ""}
      isOptionEqualToValue={(option, value) =>
        option.yt_dict_roles_id === value.yt_dict_roles_id
      }
      renderOption={(props, option, { selected }) => (
        <li {...props}>
          <Checkbox checked={selected} />
          <Typography variant="body1">{option.label}</Typography>
        </li>
      )}
      noOptionsText={"Введите роль"}
      renderInput={(params) => (
        <TextField
          {...params}
          name="filter-roles"
          margin={margin}
          label={"Роли"}
          fullWidth
          variant={variant}
          required={required}
          error={error}
          helperText={
            loadingRoles ? (
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

export default AutocompleteRoleList;
