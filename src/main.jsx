import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "antd/dist/reset.css";
import "./index.css";

import { AuthProvider } from "./providers/AuthProvider";
import { ThemeProvider } from "./providers/ThemeProvider";
import { TenantProvider } from "./providers/TenantProvider";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <TenantProvider>
          <ThemeProvider>
            <App />
          </ThemeProvider>
        </TenantProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
