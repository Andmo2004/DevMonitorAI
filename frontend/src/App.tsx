import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Governance from "./pages/Governance";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/governance" element={<Governance />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
