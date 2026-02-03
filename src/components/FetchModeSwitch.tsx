import * as React from "react";
import { FormControlLabel, Switch, Tooltip } from "@mui/material";

export interface FetchModeSwitchProps {
  showAdminControls: boolean;
  login?: string | null;
  onToggle: () => void;
  disabled?: boolean;
}

/**
 * Переключатель режима выборки:
 *  - showAdminControls = false → выборка по своему логину
 *  - showAdminControls = true  → выборка по выбранному сотруднику (AutocompleteUsers)
 */
export default function FetchModeSwitch({
  showAdminControls,
  login,
  onToggle,
  disabled,
}: FetchModeSwitchProps) {
  const title = showAdminControls
    ? "Переключится на выборку по своему логину"
    : "Переключится на выборку по сотруднику";

  return (
    <Tooltip title={title} placement="top">
      <FormControlLabel
        control={
          <Switch
            checked={showAdminControls}
            onChange={onToggle}
            color="primary"
            disabled={disabled}
          />
        }
        labelPlacement="bottom"
        label={!showAdminControls ? login || "" : ""}
        sx={{ m: 0 }}
      />
    </Tooltip>
  );
}
