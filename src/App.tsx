import { BrowserRouter } from "react-router-dom";
import { AppRoutes } from "./router";
import { I18nextProvider } from "react-i18next";
import i18n from "./i18n";
import { AuthProvider } from "./context";
import { ToastProvider } from "./context/ToastContext";

function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter basename={__BASE_PATH__}>
            <AppRoutes />
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </I18nextProvider>
  );
}

export default App;