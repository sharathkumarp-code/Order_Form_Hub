import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setBaseUrl } from "@workspace/api-client-react";

// Set the base URL for the API client, using the environment variable VITE_API_BASE_URL
// for production/hosting, and defaulting to "/api" for local development.
setBaseUrl(import.meta.env.VITE_API_BASE_URL || "/api");

createRoot(document.getElementById("root")!).render(<App />);
