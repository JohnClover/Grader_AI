import React from "react";
import { HashRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { AppProvider } from "./contexts/AppContext";
import { Sidebar } from "./components/Sidebar";
import { Dashboard } from "./components/Dashboard";
import { Configuration } from "./components/Configuration";
import { GradingDetail } from "./components/GradingDetail";
import { Monitor } from "./components/Monitor";

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-bg-main">
      <Sidebar />
      <main className="flex-1 flex flex-col h-full min-w-0">{children}</main>
    </div>
  );
};

// Wrapper to conditionally render Sidebar only for Dashboard and Config, 
// as Grading Detail takes full screen in the design
const AppContent: React.FC = () => {
    const location = useLocation();
    const isFullScreen = location.pathname.startsWith('/grade/');

    if (isFullScreen) {
        return (
            <Routes>
                <Route path="/grade/:id" element={<GradingDetail />} />
            </Routes>
        )
    }

    return (
        <Layout>
            <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/config" element={<Configuration />} />
                <Route path="/monitor" element={<Monitor />} />
            </Routes>
        </Layout>
    )
}

const App: React.FC = () => {
  return (
    <AppProvider>
      <Router>
        <AppContent />
      </Router>
    </AppProvider>
  );
};

export default App;
