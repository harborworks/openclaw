import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { configureAmplify } from "./auth";
import App from "./App";

configureAmplify();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
