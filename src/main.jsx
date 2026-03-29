import { createRoot }     from "react-dom/client";
import { BrowserRouter }  from "react-router-dom";
import "./styles/global.css";
import App                from "./App.jsx";
import { ErrorBoundary }  from "./ErrorBoundary.jsx";

createRoot(document.getElementById("root")).render(
  <ErrorBoundary>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </ErrorBoundary>
);
