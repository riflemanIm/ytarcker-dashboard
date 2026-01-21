import { getTlRoles } from "@/actions/data";
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

interface SelectRoleListProps {
  variant?: "standard" | "outlined" | "filled";
  margin?: "none" | "dense" | "normal";
  required?: boolean;
  error?: boolean;
  helperText?: string;
}

const SelectRoleList: React.FC<SelectRoleListProps> = ({
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
        console.error("[SelectRoleList] getTlRoles error:", error.message);
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

  const handleChange = (e: SelectChangeEvent<string[]>) => {
    const value = e.target.value;
    dispatch({
      type: "setTableTimePlanState",
      payload: (prev) => ({
        ...prev,
        selectedRoleIds: Array.isArray(value) ? value : [],
      }),
    });
  };

  const disabled = loadingRoles || !roles || roles.length === 0;

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

      {loadingRoles ? (
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
