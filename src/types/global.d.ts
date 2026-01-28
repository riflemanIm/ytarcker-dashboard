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
  workingminutes?: number;
}

export interface TlGroup {
  yt_tl_group_id: number;
  label: string;
  sort_by: number;
}

export interface TlRole {
  yt_dict_roles_id: number;
  label: string;
  sort_by: number;
}

export interface TlProject {
  projectId: number;
  ProjectName: string;
  sort_by: number;
}

export interface TlGroupPatient {
  patients_fio: string;
  color_str: string;
  trackerUid: string;
  sort_by: number;
}

export interface TaskListItem {
  checklistItemId: string;
  TaskKey: string;
  TaskName: string;
  WorkName: string;
  CheckListAssignee: string;
  trackerUid: string;
  WorkMinutes: number;
  Deadline: string | null;
  WorkNameDict: string;
}

export interface WorkPlanItem {
  YT_TL_WORKPLAN_ID: number;
  IsPlan: string;
  Deadline: string | null;
  Priority: string;
  TaskKey: string;
  TaskName: string;
  WorkName: string;
  WorkDone: boolean;
  EstimateTimeMinutes: number;
  SpentTimeMinutes: number;
  RemainTimeMinutes: number;
  Sprint?: string;
  WorkingMinutes?: number;
  ProjectName: string;
  checklistItemId?: string | null;
  ProjectId: number;
  CheckListAssignee: string;
  trackerUid: string;
  WorkNameDict: string;
}

export interface WorkPlanCapacityItem {
  Sprint: string;
  CheckListAssignee: string;
  EstimateTimeMinutes: number;
  SpentTimeMinutes: number;
  RemainTimeMinutes: number;
  RoleName: string;
}

export interface WorkPlanCapacityState {
  rows: WorkPlanCapacityItem[];
  loading: boolean;
  refreshKey: number;
  capacityFrom: Dayjs;
  capacityTo: Dayjs;
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

export interface TableTimePlanState {
  sprins: TlSprint[];
  sprinsLoaded: boolean;
  groups: TlGroup[];
  groupsLoaded: boolean;
  roles: TlRole[];
  rolesLoaded: boolean;
  projects: TlProject[];
  projectsLoaded: boolean;
  groupPatients: TlGroupPatient[];
  groupPatientsKey: string;
  loadingGroups: boolean;
  loadingRoles: boolean;
  loadingProjects: boolean;
  loadingPatients: boolean;
  selectedSprintId: string;
  selectedGroupIds: string[];
  selectedRoleIds: string[];
  selectedProjectIds: string[];
  selectedPatientUid: string;
  workPlanRefreshKey: number;
}

export type ViewMode =
  | "table_time_spend"
  | "table_time_plan"
  | "report"
  | "search";

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
  checklistItemId?: string | null;
  remainTimeMinutes?: number;
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
  checklistItemId?: string | null;
  remainTimeMinutes?: number;
  monday: string;
  tuesday: string;
  wednesday: string;
  thursday: string;
  friday: string;
  saturday: string;
  sunday: string;
  total: string;
  [key: string]: any;
}

export interface MenuState {
  anchorEl: HTMLElement | null;
  issue: string | null;
  field: DayOfWeek | string | null;
  issueId: string | null;
  checklistItemId?: string | null;
  remainTimeMinutes?: number;
  durations: DurationItem[] | null;
  dateField: Dayjs | null;
}

export interface AlertState {
  open: boolean;
  severity: string;
  message: string;
}
