import { getTlSprints } from "@/actions/data";
import { useAppContext } from "@/context/AppContext";
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
import React, { useEffect, useRef } from "react";

interface SelectSprintListProps {
  variant?: "standard" | "outlined" | "filled";
  margin?: "none" | "dense" | "normal";
  required?: boolean;
  error?: boolean;
  helperText?: string;
}

const SelectSprintList: React.FC<SelectSprintListProps> = ({
  variant = "outlined",
  margin = "normal",
  required = false,
  error = false,
  helperText,
}) => {
  const { tableTimePlanState, setTableTimePlanState, state, setState } =
    useAppContext();
  const { sprins, selectedSprintId } = tableTimePlanState;
  const loading = !state.loaded;
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    let isMounted = true;
    if (sprins.length > 0) return;
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    setState((prev) => ({ ...prev, loaded: false }));
    getTlSprints()
      .then((data) => {
        if (!isMounted) return;
        const sorted = [...data].sort(
          (a, b) => (a.sort_by ?? 0) - (b.sort_by ?? 0),
        );
        const defaultSprintId =
          sorted.find((item) => item.current_sprint)?.yt_tl_sprints_id ?? "";
        setTableTimePlanState((prev) => ({
          ...prev,
          sprins: sorted,
          selectedSprintId:
            prev.selectedSprintId ||
            (defaultSprintId ? String(defaultSprintId) : ""),
        }));
      })
      .catch((error) => {
        console.error("[SelectSprintList] getTlSprints error:", error.message);
        if (!isMounted) return;
        hasFetchedRef.current = false;
      })
      .finally(() => {
        setState((prev) => ({ ...prev, loaded: true }));
      });

    return () => {
      isMounted = false;
    };
  }, [setState, setTableTimePlanState, sprins.length]);

  const handleChange = (e: SelectChangeEvent<string>) => {
    const sprintId = e.target.value;
    setTableTimePlanState((prev) => ({
      ...prev,
      selectedSprintId: sprintId,
    }));
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
