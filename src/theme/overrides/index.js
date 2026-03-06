// third-party
import { merge } from 'lodash';

// project import
import Autocomplete from './Autocomplete';
import Badge from './Badge';
import DataGrid from './DataGrid';
import Button from './Button';
import CardContent from './CardContent';
import Checkbox from './Checkbox';
import Chip from './Chip';
import Dialog from './Dialog';
import DialogTitle from './DialogTitle';
import IconButton from './IconButton';
import InputLabel from './InputLabel';
import LinearProgress from './LinearProgress';
import Link from './Link';
import ListItemIcon from './ListItemIcon';
import OutlinedInput from './OutlinedInput';
import Popover from './Popover';
import Tab from './Tab';
import TableCell from './TableCell';
import Tabs from './Tabs';
import Typography from './Typography';

// ==============================|| OVERRIDES - MAIN ||============================== //

export default function ComponentsOverrides(theme) {
  return merge(
    Autocomplete(theme),
    Button(theme),
    Badge(theme),
    DataGrid(theme),
    CardContent(),
    Checkbox(theme),
    Chip(theme),
    Dialog(theme),
    DialogTitle(),
    IconButton(theme),
    InputLabel(theme),
    LinearProgress(),
    Link(),
    ListItemIcon(),
    OutlinedInput(theme),
    Popover(theme),
    Tab(theme),
    TableCell(theme),
    Tabs(),
    Typography()
  );
}
