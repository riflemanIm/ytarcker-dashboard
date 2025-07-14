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

Don’t hesitate to improve the project, pull requests welcome!"}
