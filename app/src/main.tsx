import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { FeedbackProvider } from "./components/feedback";
import "./index.css";
import { applyAppearance } from "./lib/appearance";

applyAppearance();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <FeedbackProvider><App /></FeedbackProvider>
  </StrictMode>,
);
