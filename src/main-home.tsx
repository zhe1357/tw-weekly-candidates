import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./globals.css";
import "./readability.css";
import "./selection-controls.css";
import Page from "./pages/home";

createRoot(document.getElementById("root")!).render(<StrictMode><Page /></StrictMode>);
