import { displayDuration } from "@/helpers";
import {
  parseFirstIssueTypeLabel,
  stripIssueTypeTags,
} from "@/helpers/issueTypeComment";
import type { BaseCellMenuProps } from "@/types/menu";
import {
  Box,
  DialogContentText,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Popover,
  Stack,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { FC, useMemo } from "react";

const TableCellInfoPopover: FC<BaseCellMenuProps> = ({
  open,
  onClose,
  menuState,
  onPaperMouseEnter,
  onPaperMouseLeave,
  paperRef,
  onCloseButtonClick,
}) => {
  const { durations, dateField, issue } = menuState;

  const items = useMemo(() => durations ?? [], [durations]);

  const titleDate = useMemo(
    () => dateField?.format("DD.MM.YYYY") ?? "",
    [dateField]
  );

  return (
    <Popover
      open={open}
      anchorEl={menuState.anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      transformOrigin={{ vertical: "top", horizontal: "left" }}
      disableRestoreFocus
      PaperProps={{
        ref: paperRef,
        onMouseEnter: onPaperMouseEnter,
        onMouseLeave: onPaperMouseLeave,
      }}
    >
      <Stack spacing={1} sx={{ p: 2, maxWidth: 360 }}>
        <Box display="flex" alignItems="flex-start" gap={1}>
          <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
            {issue}
          </Typography>
          <IconButton
            size="small"
            onClick={() => {
              onClose();
              onCloseButtonClick?.();
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
        {titleDate && (
          <Typography variant="body2" color="text.secondary">
            {titleDate}
          </Typography>
        )}
        <Divider />
        {items.length === 0 ? (
          <DialogContentText>Нет записей для отображения.</DialogContentText>
        ) : (
          <List dense disablePadding>
            {items.map(({ id, duration, comment }) => {
              const tag = parseFirstIssueTypeLabel(comment ?? "");
              const cleanComment = stripIssueTypeTags(comment ?? "");
              return (
                <ListItem key={id} alignItems="flex-start" disableGutters>
                  <ListItemText
                    primary={
                      <Typography variant="body1" fontWeight={600}>
                        {displayDuration(duration)}
                      </Typography>
                    }
                    secondary={
                      <Stack component="div" spacing={0.5}>
                        {cleanComment && (
                          <Typography
                            variant="body2"
                            sx={{ whiteSpace: "pre-wrap" }}
                          >
                            {cleanComment}
                          </Typography>
                        )}
                        {tag && (
                          <Typography variant="caption" color="primary">
                            {tag}
                          </Typography>
                        )}
                      </Stack>
                    }
                    secondaryTypographyProps={{ component: "div" }}
                  />
                </ListItem>
              );
            })}
          </List>
        )}
      </Stack>
    </Popover>
  );
};

export default TableCellInfoPopover;
