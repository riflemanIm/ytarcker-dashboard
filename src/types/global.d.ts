import { Dayjs } from "dayjs";

export interface Issue {
  key: string;
  summary: string;
  [key: string]: any;
}

export interface DataItem {
  id: string;
  duration: string;
  start: string;
  issue: { display: string; key: string };
  updatedBy: { id: string; display: string };
  comment: string;
}

export interface AuthState {
  token: string | null;
  login?: string | null;
}
export interface AuthResponse {
  token: string;
  login: string;
}
export interface AuthError {
  error: string;
  error_description: string;
}
export interface User {
  id: string;
  name: string;
}

export interface AppState {
  loaded: boolean;
  userId: string | null;
  users: User[] | null;
  data: DataItem[];
  fetchByLogin: boolean;
  issues: Issue[];
}

export interface GetDataArgs {
  userId: string | null;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  token: string | null;
  start: string;
  end: string;
  login?: string;
}

export type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export interface DurationItem {
  id: string;
  duration: string;
  comment?: string;
}

export interface TaskItemIssue {
  display: string;
  href: string;
  fio: string;
}
export interface TaskItem {
  id: string;
  key: string;
  issueId: string;
  issue: TaskItemIssue;
  groupIssue: string;

  start: string;
  duration: string;
  comment: string;
  durations?: DurationItem[];
}

/**
 * Можно вынести информацию для дней недели в объект,
 * что позволит динамически перебрать дни, не прописывая каждое свойство.
 */
export interface TransformedTaskRow {
  id: string;
  issue: TaskItemIssue;
  issueId: string;
  groupIssue: string;
  monday: DayOfWeek[];
  tuesday: DayOfWeek[];
  wednesday: DayOfWeek[];
  thursday: DayOfWeek[];
  friday: DayOfWeek[];
  saturday: DayOfWeek[];
  sunday: DayOfWeek[];
  total: string;
}

export interface MenuState {
  anchorEl: HTMLElement | null;
  issue: string | null;
  field: DayOfWeek | null;
  issueId: string | null;
  durations: DurationItem[] | null;
  dateField: Dayjs | null;
}

export interface AlertState {
  open: boolean;
  severity: string;
  message: string;
}
