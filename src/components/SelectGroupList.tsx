import { getTlGroups } from "@/actions/data";
import { useAppContext } from "@/context/AppContext";
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
import React, { useEffect, useRef } from "react";

interface SelectGroupListProps {
  variant?: "standard" | "outlined" | "filled";
  margin?: "none" | "dense" | "normal";
  required?: boolean;
  error?: boolean;
  helperText?: string;
}

const SelectGroupList: React.FC<SelectGroupListProps> = ({
  variant = "outlined",
  margin = "normal",
  required = false,
  error = false,
  helperText,
}) => {
  const { state: appState, dispatch } = useAppContext();
  const { groups, loadingGroups, selectedGroupIds } =
    appState.tableTimePlanState;
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    let isMounted = true;
    if (groups.length > 0) return;
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    dispatch({
      type: "setTableTimePlanState",
      payload: (prev) => ({ ...prev, loadingGroups: true }),
    });
    getTlGroups()
      .then((data) => {
        if (!isMounted) return;
        const sorted = [...data].sort(
          (a, b) => (a.sort_by ?? 0) - (b.sort_by ?? 0),
        );
        dispatch({
          type: "setTableTimePlanState",
          payload: (prev) => ({
            ...prev,
            groups: sorted,
            loadingGroups: false,
          }),
        });
      })
      .catch((error) => {
        console.error("[SelectGroupList] getTlGroups error:", error.message);
        if (!isMounted) return;
        hasFetchedRef.current = false;
      })
      .finally(() => {
        dispatch({
          type: "setTableTimePlanState",
          payload: (prev) => ({ ...prev, loadingGroups: false }),
        });
      });

    return () => {
      isMounted = false;
    };
  }, [dispatch, groups.length]);

  const handleChange = (e: SelectChangeEvent<string[]>) => {
    const value = e.target.value;
    dispatch({
      type: "setTableTimePlanState",
      payload: (prev) => ({
        ...prev,
        selectedGroupIds: Array.isArray(value) ? value : [],
      }),
    });
  };

  const disabled = loadingGroups || !groups || groups.length === 0;

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

      {loadingGroups ? (
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
