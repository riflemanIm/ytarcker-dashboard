<!-- english -->

This document is in English.
Для русской версии смотрите [README.ru.md](README.ru.md).

# YTracker-Dashboard

This project provides a minimal setup for running React in Vite with HMR support and basic ESLint rules.

Currently two official plugins are available:

* [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) — uses Babel for Fast Refresh
* [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) — uses SWC for Fast Refresh

## About the project

YTracker-Dashboard lets you track the time spent on completing issues in Yandex Tracker.
Time tracking helps you plan project deadlines and budgets more accurately, and identify bottlenecks while working on tasks.

For convenient accounting, a special **TaskTable** component is provided, which visually displays the time logged per task across the days of the week. The component makes it easy to see how many hours were spent on each issue and each weekday.

The TaskTable supports interactive editing directly in the table, automatically validates and normalizes entered values into a correct ISO-duration format (e.g. you can enter `1d`, `2h`, `30m`), and highlights invalid entries to help users avoid mistakes. With this component, teams can quickly control time usage and make informed project decisions.

---

## Features

Below is an overview of all functionality provided by YTracker-Dashboard:

* **Yandex OAuth Authentication**
  Users sign in with their Yandex account via OAuth to securely fetch and manage issues.

* **Automatic Issue Import**
  On login, the dashboard retrieves your list of Yandex Tracker issues, including `key`, `summary`, and grouping fields.

* **Flexible Time Entry**

  * **Quick-add dialog** for manual time entries: select an issue, pick date & time, enter duration (supports `1d`, `2h`, `30m`) and add an optional comment.
  * **Inline cell menu** in TaskTable for editing, appending, or deleting one or multiple time records per task/day.

* **Interactive Task Table**

  * **Seven columns** for each weekday plus a **“Total”** column, all generated dynamically.
  * **Grouping** of worklogs by issue key and group name.
  * **Summation** of durations per task and per day, with a summary row at the bottom.
  * **Current day highlighting** to easily spot today’s column.
  * **Sorting** by duration values using an ISO-duration comparator.

* **Data Validation & Normalization**

  * Real-time validation of duration input format.
  * Automatic conversion and normalization of entries (e.g. `1h30m`) into a consistent format.

* **Week Navigation**

  * Built-in **WeekNavigator** to move forward or backward by one week.
  * Automatic reload of time data when changing weeks.

* **User-Mode Switching**

  * Toggle between viewing **your own** time and **team members’** time.
  * **Autocomplete** control for selecting employees in “by-user” mode.

* **Live Updates & Alerts**

  * **Linear progress bar** during data fetch.
  * **Snackbar alerts** for success, error, or validation messages (e.g. “Data saved,” “Invalid duration format,” etc.).

* **TypeScript & Material-UI**
  Built with React + Vite, TypeScript, Material-UI components (DataGrid, Dialogs, Pickers), and dayjs for date handling.

---

## View Modes (Menu)

The header menu lets you switch between four modes (`ViewMode`):

* **Time Spend Table** (`table_time_spend`) — weekly worklog table with inline add/edit/delete, totals by day and task.
* **Time Plan** (`table_time_plan`) — sprint planning view with filters (sprint, group, role, project, assignee) and plan/capacity data.
* **Report** (`report`) — monthly report aggregated by weeks (admin-only).
* **Search** (`search`) — full‑text search across tasks/queues with task details and comments.

Time Plan tables:
* **Task Selection** (TableCheckPlan) — list of candidate tasks to include in plan, with filter, task info dialog, and “add to plan” action.
* **Staff Capacity** (TableWorkPlanCapacity, admin) — capacity vs spent vs remaining by sprint/assignee/role for the selected period.
* **Work Plan** (TableWorkPlan) — plan items with priorities, deadlines, estimates, spent/remaining, assignee and status; admin can edit/delete plan items; non‑admin can add time for a plan item.
* **Time Spend by Plan** (TableTimeSpendByPlan) — shows only worklogs linked to plan tasks, with totals per day; editable only in non‑admin mode.

---

## Admin Mode (`isAdmin` / `planEditMode`)

Admin access is defined by `isAdmin` (returned from TL user info).

**If `isAdmin = false`**
* No admin switch in the header.
* `report` view is hidden.
* Plan view shows only **Work Plan** and **Time Spend by Plan** tables; time entries are editable.

**If `isAdmin = true`**
* Header shows **Admin switch** (FetchModeSwitch) to toggle `showAdminControls`.
* `report` view is available.
* In **table_time_spend** you can switch between your own data and a selected employee.
* In **table_time_plan** you get extra filters (group, patient, role, project) and the **Task Selection** and **Staff Capacity** tables.

**If `planEditMode = true` (admin only)**
* The UI forces **Time Plan** view (table time spend is hidden in the menu).
* **Work Plan** becomes editable (add/edit/delete plan items).

---

## Environment Setup

Create a `.env` file in the project root and add the following variables:

```dotenv
VITE_APP_CLIENT_ID=xxxxxxxxxxx
VITE_APP_REDIRECT_URI=https://ytracker.mobimed.ru
VITE_APP_API_URL=https://ytracker.mobimed.ru
```

Where:

* `VITE_APP_CLIENT_ID` — your Yandex OAuth application client ID
* `VITE_APP_REDIRECT_URI` — the redirect URI after authorization
* `VITE_APP_API_URL` — the base URL of your API endpoint

---

## API Methods

All methods are provided by the proxy server (port 4000).  
Authentication: pass `token` (OAuth) either as query (GET) or in body (POST/PATCH).

Worklog entries are saved **both** to Yandex Tracker and to the internal PMT system.  
The `/api/worklog_update` endpoint orchestrates this synchronization.

### `GET /api/issues`
Fetch worklog entries within a date range.  
**Query Parameters**
- `token` (string, required)  
- `startDate` (YYYY-MM-DD, required)  
- `endDate` (YYYY-MM-DD, required) → server appends `T23:59`  
- `userId` (string, optional) — filter by author ID  
- `login` (string, optional) — filter by author login  

**Response**
```json
{
  "data": [ /* array of worklog objects from Yandex Tracker */ ],
  "users": [
    { "id": "123", "name": "Jane Doe" }
  ]
}
```

---

### `POST /api/worklog_update`
Unified endpoint to add/edit/delete a worklog entry in Yandex Tracker and synchronize internal TL data.

**Body Parameters (main)**
- `token` (string, required for Tracker updates; can be omitted for internal-only updates)
- `taskKey` (string, required)
- `action` (number, required) — `0` Add, `1` Edit, `2` Delete
- `duration` (number or string, required for add/edit)
- `start` (YYYY-MM-DDTHH:mm, required for add)
- `startDate` (YYYY-MM-DD or YYYY-MM-DDTHH:mm, required for internal updates)
- `comment` (string, required)
- `worklogId` (number, required for edit/delete)
- `worklogIdInternal` (number, optional)
- `trackerUid` (string, required for internal updates)
- `checklistItemId` (string, optional)
- `issueTypeLabel` (string, optional)
- `workPlanId` (string or number, optional)
- `deadlineOk`, `needUpgradeEstimate`, `makeTaskFaster` (boolean, required for internal updates)
- `items` (array, optional) — batch delete payload (objects with `worklogId`, `duration`, `startDate`, `comment`, optional `checklistItemId`)

**Response** → created/updated worklog object, or `true` for delete.

---

### `GET /api/user_issues`
Retrieve issues assigned to or created by a user, merged & deduplicated.  
**Query Parameters**
- `token` (string, required)  
- `userId` (string) or `login` (string)  

**Response**
```json
{
  "issues": [
    { "key": "PROJ-123", "summary": "Fix login bug" }
  ]
}
```

---

### `GET /api/queues`
Return list of available queues.  
**Query Parameters**: `token` (string, required).  
**Response** → `{ "queues": [{ "id": "1", "key": "ABC", "name": "Team ABC" }] }`.

---

### `GET /api/search_issues`
Full‑text search by query and queue.  
**Query Parameters**
- `token` (string, required)
- `search_str` (string, required)
- `queue` (string, optional, `"all"` to disable filter)
- `page` (number, optional, default 1)
- `per_page` or `perPage` (number, optional, max 50)

**Response** → `{ issues, total, page, perPage, hasMore }`.

---

### `GET /api/issue_type_list`
Retrieve issue type list for a given entity key.  
**Query Parameters**
- `token` (string, required)  
- `entityKey` (string, required)  
- `email` (string, required)  

> TLS verification is disabled **only for this request**. Timeout: 15s.

**Response**
```json
{
  "issue_type_list": [ /* upstream system response */ ]
}
```

**Error format**
```json
{
  "error": "message",
  "code": "ECONNABORTED",
  "cause": null,
  "upstreamStatus": 502,
  "upstreamData": { /* raw upstream error */ }
}
```

---

### `POST /api/tl_userinfo`
Get TL user info by `trackerUid` or `email`.  
**Body Parameters**: `trackerUid` (string, optional), `email` (string, optional).

---

### `POST /api/tl_sprints`
Get list of sprints.

---

### `POST /api/tl_groups`
Get list of groups.

---

### `POST /api/tl_roles`
Get list of roles.

---

### `POST /api/tl_projects`
Get list of projects.

---

### `POST /api/tl_group_patients`
Get group patients by IDs.  
**Body Parameters**: `groupIds` (array of integers, required).

---

### `POST /api/tl_tasklist`
Get task list by filters.  
**Body Parameters**: `trackerUids` (string[]), `projectIds` (int[]), `roleIds` (int[]), `groupIds` (int[]).

---

### `POST /api/tl_workplan`
Get work plan by sprint and filters.  
**Body Parameters**: `sprintId` (int, required), `trackerUids` (string[]), `projectIds` (int[]), `roleIds` (int[]), `groupIds` (int[]).

---

### `POST /api/tl_workplan_capacity`
Get work plan capacity for a date range and filters.  
**Body Parameters**: `dateStart` (string, required), `dateEnd` (string, required), `trackerUids` (string[]), `projectIds` (int[]), `roleIds` (int[]), `groupIds` (int[]).

---

### `POST /api/setworkplan`
Create/edit/delete a work plan item.  
**Body Parameters**: `sprintId` (int, required), `taskKey` (string, required), `trackerUid` (string, required), `action` (0/1/2, required), `workPlanId` (int, required for edit/delete), `checklistItemId`, `workName`, `deadline`, `estimateTimeMinutes`, `priority`.

---

### `POST /api/task_plan_info`
Get plan info for a task.  
**Body Parameters**: `taskKey` (string, required).

---

### `POST /api/yt_tl_checklist_data`
Sync/checklist plan data by entity.  
**Body Parameters**: `entityKey` (string, required), optional flags `updatePlan`, `rePlan`, `synchronizePlan` (boolean).

---

Don’t hesitate to improve the project, pull requests welcome!
