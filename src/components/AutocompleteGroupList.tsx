import { getTlGroups } from "@/actions/data";
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

interface AutocompleteGroupListProps {
  variant?: "standard" | "outlined" | "filled";
  margin?: "none" | "dense" | "normal";
  required?: boolean;
  error?: boolean;
  helperText?: string;
}

const AutocompleteGroupList: React.FC<AutocompleteGroupListProps> = ({
  variant = "outlined",
  margin = "normal",
  required = false,
  error = false,
  helperText,
}) => {
  const { state: appState, dispatch } = useAppContext();
  const { groups, groupsLoaded, loadingGroups, selectedGroupIds } =
    appState.tableTimePlanState;
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    let isMounted = true;
    if (groupsLoaded || groups.length > 0) return;
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
            groupsLoaded: true,
            loadingGroups: false,
          }),
        });
      })
      .catch((error) => {
        console.error(
          "[AutocompleteGroupList] getTlGroups error:",
          error.message,
        );
        if (!isMounted) return;
        hasFetchedRef.current = false;
        dispatch({
          type: "setTableTimePlanState",
          payload: (prev) => ({ ...prev, groupsLoaded: false }),
        });
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
  }, [dispatch, groups.length, groupsLoaded]);

  const handleChange = (
    event: React.SyntheticEvent,
    value: { yt_tl_group_id: number; label: string }[],
  ) => {
    dispatch({
      type: "setTableTimePlanState",
      payload: (prev) => ({
        ...prev,
        selectedGroupIds: value.map((item) =>
          String(item.yt_tl_group_id),
        ),
      }),
    });
  };

  const disabled = loadingGroups || !groups || groups.length === 0;
  const options = (groups || []).map((item) => item);
  const value = (groups || []).filter((item) =>
    selectedGroupIds.includes(String(item.yt_tl_group_id)),
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
        option.yt_tl_group_id === value.yt_tl_group_id
      }
      renderOption={(props, option, { selected }) => (
        <li {...props}>
          <Checkbox checked={selected} />
          <Typography variant="body1">{option.label}</Typography>
        </li>
      )}
      noOptionsText={"Введите название группы"}
      renderInput={(params) => (
        <TextField
          {...params}
          name="filter-groups"
          margin={margin}
          label={"Группы"}
          fullWidth
          variant={variant}
          required={required}
          error={error}
          helperText={
            loadingGroups ? (
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

export default AutocompleteGroupList;
