import ReactDOM from "react-dom/client";
import AppThemeProvider from "./theme";
import App from "./App";
console.log("App version:", __APP_VERSION__);
const rootElement = document.getElementById("root") as HTMLElement;
const root = ReactDOM.createRoot(rootElement);
root.render(
  <AppThemeProvider>
    <App />
  </AppThemeProvider>
);
