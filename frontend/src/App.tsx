import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/layout";
import Dashboard from "./pages/Dashboard";
import Governance from "./pages/Governance";
import Insights from "./pages/Insights";
import Predictions from "./pages/Predictions";
import { ThemeProvider } from "./components/theme-provider";
import "./App.css";

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="glasstics-theme">
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/governance" element={<Governance />} />
            <Route path="/insights" element={<Insights />} />
            <Route path="/predictions" element={<Predictions />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
