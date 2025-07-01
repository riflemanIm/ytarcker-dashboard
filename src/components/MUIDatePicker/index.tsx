import { DatePicker, DateView } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { enUS, frFR, ruRU } from "@mui/x-date-pickers/locales";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { Dayjs } from "dayjs";
import "dayjs/locale/fr";
import "dayjs/locale/ru";
import React, { FC, memo, useCallback } from "react";
export interface MuiUIPickerProps {
  name: string;
  value: Dayjs | null;
  defaultValue?: Dayjs;
  label: string;
  format?: string;
  handleDateChange: (value: Dayjs | null, name: string) => void;
  disablePast?: boolean;
  disabled?: boolean;
  required?: boolean;
  errorText?: string;
  minDate?: Dayjs;
  maxDate?: Dayjs;
  margin?: "none" | "dense" | "normal";
  preventKeyDown?: boolean;
  variant?: "outlined" | "filled" | "standard";
  views?: readonly DateView[];
  view?: DateView;
}

const defaultViews = ["year", "month", "day"] as const;
const getLocaleText = (lang: string) => {
  switch (lang) {
    case "en":
      return enUS.components.MuiLocalizationProvider.defaultProps!.localeText;
    case "fr":
      return frFR.components.MuiLocalizationProvider.defaultProps!.localeText;
    case "ru":
    default:
      return ruRU.components.MuiLocalizationProvider.defaultProps!.localeText;
  }
};
const MuiUIPicker: FC<MuiUIPickerProps> = memo(
  ({
    name,
    value,
    defaultValue,
    label,
    format,
    handleDateChange,
    disablePast = false,
    disabled = false,
    required = false,
    errorText,
    minDate,
    maxDate,
    margin = "normal",
    preventKeyDown = false,
    variant = "outlined",
    views = defaultViews,
    view,
  }) => {
    const language = "ru";
    const onChange = useCallback(
      (newValue: Dayjs | null) => handleDateChange(newValue, name),
      [handleDateChange, name]
    );

    const textFieldProps = {
      margin,
      variant,
      required,
      fullWidth: true,
      error: Boolean(errorText),
      helperText: errorText,
      inputProps: { "data-testid": name },
      onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (preventKeyDown) e.preventDefault();
      },
    };

    const switchViewProps =
      view === "day" ? { sx: { display: "none" } } : undefined;

    const calendarHeaderProps = view
      ? {
          sx: {
            ".MuiPickersCalendarHeader-label": { cursor: "default" },
          },
        }
      : undefined;

    return (
      <LocalizationProvider
        dateAdapter={AdapterDayjs}
        adapterLocale={language}
        localeText={getLocaleText(language)}
      >
        <DatePicker
          name={name}
          label={label}
          value={value}
          defaultValue={defaultValue}
          format={format}
          onChange={onChange}
          disablePast={disablePast}
          disabled={disabled}
          minDate={minDate}
          maxDate={maxDate}
          views={views}
          view={view}
          slotProps={{
            textField: textFieldProps,
            switchViewButton: switchViewProps,
            calendarHeader: calendarHeaderProps,
          }}
        />
      </LocalizationProvider>
    );
  }
);

export default MuiUIPicker;
