import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { FeedbackProvider } from "./components/feedback";
import "@fontsource/rajdhani/latin-500.css"; import "@fontsource/rajdhani/latin-600.css"; import "@fontsource/rajdhani/latin-700.css";
import "@fontsource/chakra-petch/latin-500.css"; import "@fontsource/chakra-petch/latin-600.css";
import "@fontsource/oxanium/latin-500.css"; import "@fontsource/oxanium/latin-600.css";
import "@fontsource/saira-semi-condensed/latin-500.css"; import "@fontsource/saira-semi-condensed/latin-600.css";
import "@fontsource/exo-2/latin-500.css"; import "@fontsource/exo-2/latin-600.css";
import "@fontsource/teko/latin-500.css"; import "@fontsource/teko/latin-600.css";
import "./index.css";
import { applyAppearance } from "./lib/appearance";

applyAppearance();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <FeedbackProvider><App /></FeedbackProvider>
  </StrictMode>,
);
