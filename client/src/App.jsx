import { Routes, Route, useLocation } from 'react-router-dom';
import { NavBar } from './components/NavBar.jsx';
import { Home } from './pages/Home.jsx';
import { CommandCenter } from './pages/CommandCenter.jsx';
import { Detector } from './pages/Detector.jsx';
import { Driver } from './pages/Driver.jsx';
import { CarDisplay } from './pages/CarDisplay.jsx';
import { Report } from './pages/Report.jsx';

// Pages that take over the whole screen (no site nav).
const FULLSCREEN = ['/car'];

export function App() {
  const { pathname } = useLocation();
  const bare = FULLSCREEN.includes(pathname);
  return (
    <>
      {!bare && <NavBar />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/command" element={<CommandCenter />} />
        <Route path="/detector" element={<Detector />} />
        <Route path="/drive" element={<Driver />} />
        <Route path="/car" element={<CarDisplay />} />
        <Route path="/report" element={<Report />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </>
  );
}
