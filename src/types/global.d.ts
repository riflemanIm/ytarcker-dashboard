import { Dayjs } from "dayjs";

export interface Issue {
  key: string;
  summary: string;
  status?: string;
  queue?: string;
  assignee?: string;
  description?: string;
  commentsText?: string;
  [key: string]: any;
}

export interface SearchIssuesResponse {
  issues: Issue[];
  total: number;
  page: number;
  perPage: number;
  hasMore?: boolean;
}
export interface IssueType {
  label: string;
  hint: string;
}

export interface TlSprint {
  yt_tl_sprints_id: number;
  sprint: string;
  current_sprint: boolean;
  archive: boolean;
  sort_by: number;
}

export interface TlGroup {
  yt_tl_group_id: number;
  label: string;
  sort_by: number;
}

export interface TlGroupPatient {
  patients_fio: string;
  color_str: string;
  trackerUid: string;
  sort_by: number;
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

export interface QueueInfo {
  id?: string;
  key: string;
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

export type ViewMode =
  | "table_time_spend"
  | "table_time_plan"
  | "report"
  | "search";

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
  start: string;
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

export interface TaskItemMenu {
  issue_type_list?: IssueType[];
  durations?: DurationItem[];
  loaded: boolean;
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
  monday: string;
  tuesday: string;
  wednesday: string;
  thursday: string;
  friday: string;
  saturday: string;
  sunday: string;
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
