import ReactDOM from "react-dom/client";
import AppThemeProvider from "./theme";
import App from "./App";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <AppThemeProvider>
    <App />
  </AppThemeProvider>
);
