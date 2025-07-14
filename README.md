<!-- english -->
See the Russian version in [README.ru.md](README.ru.md).

# YTracker-Dashboard

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## In the YTracker-Dashboard, you can keep track of the time spent on completing a task.

Time tracking helps you plan project deadlines and budgets more accurately, and identify problem areas when working on tasks.

#### For convenient accounting, a special Task Table component is provided, which visually displays the time spent on tasks in the context of the days of the week. This component allows you to quickly analyze the distribution of working hours, see the totals for each task and for each day of the week.

TaskTable supports interactive editing of data directly in the table, automatically checks and converts the entered values into the correct duration format (for example, you can enter 1d, 2h, 30m), and also highlights incorrect values, helping the user avoid errors when entering data. Thanks to this component, the team can quickly control time, promptly identify deviations from planned targets and make informed decisions on project management.

---

## Features

Below is a quick overview of all the functionality provided by the YTracker-Dashboard:

- **Yandex OAuth Authentication**  
  Users log in with their Yandex account via OAuth to securely fetch and manage their tasks.

- **Automatic Issue Import**  
  On login, the dashboard retrieves the list of your Yandex Tracker issues, including `key`, `summary` and grouping fields.

- **Flexible Time Entry**  
  - **Quick-add dialog** for manual time entries: choose an issue, pick date & time, enter duration (supports `1d`, `2h`, `30m` formats) and add an optional comment.  
  - **Inline cell menu** in the TaskTable for editing, appending or deleting one or multiple time records per day/task.

- **Interactive Task Table**  
  - **Seven columns** for each weekday plus an **“Total”** column, all generated dynamically.  
  - **Grouping** of worklogs by issue key and group name.  
  - **Summation** of durations per task and per day, with a summary row at the bottom.  
  - **Current day highlighting** to easily spot today’s column.  
  - **Sorting** by duration values using an ISO-duration comparator.

- **Data Validation & Normalization**  
  - Real-time checks on user input to ensure valid ISO-duration format.  
  - Automatic conversion/normalization of inputs like `1h30m` into a consistent representation.

- **Week Navigation**  
  - Built-in **WeekNavigator** to move forward or backward by one week.  
  - Automatic reload of time data upon week change.

- **User-Mode Switching**  
  - Toggle between viewing **your own** time vs. **team members’** time.  
  - **Autocomplete** control for selecting employees when in “by-user” mode.

- **Live Updates & Alerts**  
  - **Linear progress bar** during data fetch.  
  - **Snackbar alerts** for success, error or validation messages (e.g. “Data saved,” “Invalid duration format,” etc.).

- **TypeScript & Material-UI**  
  Built entirely with React + Vite, TypeScript, Material-UI components (DataGrid, Dialogs, Pickers), and dayjs for date handling.

---

*Feel free to expand this further with installation instructions, environment variable references (`VITE_APP_API_URL`, `VITE_APP_REDIRECT_URI`, etc.), and examples of configuration.*
::contentReference[oaicite:0]{index=0}
