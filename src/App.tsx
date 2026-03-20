import { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { listen } from "@tauri-apps/api/event";
import { Layout } from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Logs from "@/pages/Logs";
import Nodes from "@/pages/Nodes";
import Profiles from "@/pages/Profiles";
import Settings from "@/pages/Settings";
import { useProxyStore } from "@/store";
import "@/globals.css";

function App() {
  const { toggleProxy } = useProxyStore();

  useEffect(() => {
    // 监听托盘的代理切换事件
    const unlisten = listen("toggle-proxy", () => {
      toggleProxy();
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [toggleProxy]);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="logs" element={<Logs />} />
          <Route path="nodes" element={<Nodes />} />
          <Route path="profiles" element={<Profiles />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
