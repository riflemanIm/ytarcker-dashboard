import React from "react";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Autocomplete from "@mui/material/Autocomplete";
import isEmpty from "../helpers";

interface Users {
  id: number;
  name: string;
}

interface AutocompleteUsersProps {
  userId: string | null;
  handleSelectedUsersChange: (id: string | null) => void;
  disabled?: boolean;
  disableClearable?: boolean;
  users: Users[];
}

const AutocompleteUsers: React.FC<AutocompleteUsersProps> = ({
  userId,
  handleSelectedUsersChange,
  disabled = false,
  disableClearable = false,
  users,
}) => {
  const handleChange = (event: React.SyntheticEvent, value: Users | null) => {
    handleSelectedUsersChange(value?.id ? value.id.toString() : null);
  };

  const options = (users || []).map((item: Users) => item);

  const value =
    (users || []).find((item: Users) => item.id.toString() === userId) || null;

  return (
    !isEmpty(options) && (
      <Autocomplete
        disableClearable={disableClearable}
        blurOnSelect
        clearOnBlur
        autoSelect
        disabled={disabled}
        value={value}
        options={options}
        onChange={handleChange}
        getOptionLabel={(option: Users) => option?.name || ""}
        isOptionEqualToValue={(option: Users, value: Users) =>
          option.id === value.id
        }
        renderOption={(props, option: Users) => (
          <Typography variant="body1" {...props}>
            {option.name}
          </Typography>
        )}
        noOptionsText={"Ведите имя сотрудника"}
        renderInput={(params) => (
          <TextField
            {...params}
            name="filter-users"
            margin="dense"
            label={"Выбрать сотрудника"}
            fullWidth
            variant="outlined"
          />
        )}
      />
    )
  );
};

export default AutocompleteUsers;
