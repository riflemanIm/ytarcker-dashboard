import ReactDOM from "react-dom/client";
import AppThemeProvider from "./theme";
import App from "./App";
import { AppProvider } from "@/context/AppContext";
console.log("App version:", __APP_VERSION__);
const rootElement = document.getElementById("root") as HTMLElement;
const root = ReactDOM.createRoot(rootElement);
root.render(
  <AppProvider>
    <AppThemeProvider>
      <App />
    </AppThemeProvider>
  </AppProvider>
);
