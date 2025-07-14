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

Below is a summary of the backend proxy endpoints used by the dashboard:

### `GET /api/issues`
Fetch all worklog entries within a date range (and optionally for a specific user).  
**Query Parameters**  
- `token` (string, required) – OAuth token.  
- `startDate` (YYYY-MM-DD, required) – start of the range.  
- `endDate` (YYYY-MM-DD, required) – end of the range.  
- `userId` (string, optional) – filter by Yandex user ID.  
- `login` (string, optional) – filter by Yandex login name.  
**Response**  
```json
{
  "data": [ /* array of worklog objects */ ],
  "users": [
    { "id": "123", "name": "Jane Doe" },
    /* ...unique list of users who updated those worklogs... */
  ]
}
``` :contentReference[oaicite:1]{index=1}

### `GET /api/user_issues`
Retrieve all issues assigned to a user, sorted by last update.  
**Query Parameters**  
- `token` (string, required)  
- `userId` (string, optional) or  
- `login` (string, optional)  
**Response**  
```json
{
  "issues": [
    { "key": "PROJ-123", "summary": "Fix login bug" },
    /* ... */
  ]
}
``` :contentReference[oaicite:2]{index=2}

### `POST /api/add_time`
Create a new worklog entry on an issue.  
**Body Parameters** (JSON)  
- `token` (string, required)  
- `issueId` (string, required) – the issue key or ID.  
- `start` (ISO timestamp, required) – e.g. `"2025-07-14T09:00"`  
- `duration` (ISO 8601 duration, required) – e.g. `"PT1H30M"`  
- `comment` (string, optional)  
**Response**  
Returns the created worklog object. :contentReference[oaicite:3]{index=3}

### `PATCH /api/edit_time`
Edit an existing worklog entry.  
**Body Parameters** (JSON)  
- `token` (string, required)  
- `issueId` (string, required)  
- `worklogId` (string, required)  
- `duration` (ISO 8601 duration, required)  
- `comment` (string, optional)  
**Response**  
Returns the updated worklog object. :contentReference[oaicite:4]{index=4}

### `POST /api/delete_all`
Delete multiple worklog entries on an issue.  
**Body Parameters** (JSON)  
- `token` (string, required)  
- `issueId` (string, required)  
- `ids` (array of worklog IDs, required)  
**Response**  
Returns `true` on success. :contentReference[oaicite:5]{index=5}

---

Don’t hesitate to improve the project, pull requests welcome!"}