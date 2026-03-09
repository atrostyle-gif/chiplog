import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HeaderNav } from "./components/HeaderNav";
import { SelectChip } from "./pages/SelectChip";
import { ChipDetail } from "./pages/ChipDetail";
import { CuttingLog } from "./pages/CuttingLog";
import { ChipAdmin } from "./pages/ChipAdmin";
import { RecommendationAdmin } from "./pages/RecommendationAdmin";
import "./styles/app.css";

function App() {
  return (
    <BrowserRouter>
      <div className="app-layout">
        <HeaderNav />
        <main className="app-content">
          <Routes>
            <Route path="/" element={<SelectChip />} />
            <Route path="/chip/:id" element={<ChipDetail />} />
            <Route path="/cutting-log" element={<CuttingLog />} />
            <Route path="/chip-admin" element={<ChipAdmin />} />
            <Route path="/recommend-admin" element={<RecommendationAdmin />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
