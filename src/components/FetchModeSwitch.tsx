import * as React from "react";
import { FormControlLabel, Switch, Tooltip } from "@mui/material";

export interface FetchModeSwitchProps {
  fetchByLogin: boolean;
  login?: string | null;
  onToggle: () => void;
  disabled?: boolean;
}

/**
 * Переключатель режима выборки:
 *  - fetchByLogin = true  → выборка по своему логину
 *  - fetchByLogin = false → выборка по выбранному сотруднику (AutocompleteUsers)
 */
export default function FetchModeSwitch({
  fetchByLogin,
  login,
  onToggle,
  disabled,
}: FetchModeSwitchProps) {
  const title = fetchByLogin
    ? "Переключится на выборку по сотруднику"
    : "Переключится на выборку по своему логину";

  return (
    <Tooltip title={title} placement="top">
      <FormControlLabel
        control={
          <Switch
            checked={!fetchByLogin}
            onChange={onToggle}
            color="primary"
            disabled={disabled}
          />
        }
        labelPlacement="bottom"
        label={fetchByLogin ? login || "" : ""}
        sx={{ m: 0 }}
      />
    </Tooltip>
  );
}
