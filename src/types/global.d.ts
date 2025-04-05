import { Dayjs } from "dayjs";

export interface TaskItem {
  id: string;
  start: string;
  key: string;
  issue: string;
  href?: string | null;
  updatedBy: string;
  issueId: string;
  duration: string;
  durations?: DurationItem[];
}

export interface TransformedTaskRow {
  id: string;
  issue: {
    display: string;
    href?: string | null;
    fio: string;
  };
  issueId: string;
  monday: string;
  tuesday: string;
  wednesday: string;
  thursday: string;
  friday: string;
  saturday: string;
  sunday: string;
  total: string;
}

export interface DurationItem {
  id: string;
  duration: string;
  comment: string;
}
export interface MenuState {
  anchorEl: HTMLElement | null;
  issue: string | null;
  field: string | null;
  issueId: string | null;
  durations: DurationItem[] | null;
  dateField: Dayjs | null;
}

export interface AlertState {
  open: boolean;
  severity: string;
  message: string;
}
