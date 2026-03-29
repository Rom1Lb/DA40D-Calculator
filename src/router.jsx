import { Routes, Route } from "react-router-dom";
import { SetupPage }       from "./pages/SetupPage.jsx";
import { MassBalancePage } from "./pages/MassBalancePage.jsx";
import { PerformancePage } from "./pages/PerformancePage.jsx";

/**
 * AppRouter — maps URL paths to pages.
 * All pages receive the same shared state props from App.jsx.
 */
export function AppRouter(props) {
  return (
    <Routes>
      <Route
        path="/"
        element={<SetupPage {...props} />}
      />
      <Route
        path="/mass-balance"
        element={<MassBalancePage {...props} />}
      />
      <Route
        path="/performance"
        element={<PerformancePage {...props} />}
      />
    </Routes>
  );
}
