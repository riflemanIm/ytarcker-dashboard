import ReactDOM from "react-dom/client";
import AppThemeProvider from "./theme";
import App from "./App";

const rootElement = document.getElementById("root") as HTMLElement;
const root = ReactDOM.createRoot(rootElement);
root.render(
  <AppThemeProvider>
    <App />
  </AppThemeProvider>
);
