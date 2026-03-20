import { NavLink, Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useEffect, useCallback, useState, useRef } from "react";
import {
  LayoutDashboard,
  Globe,
  FileCode,
  Settings,
  Power,
  Wifi,
  WifiOff,
  ArrowUp,
  ArrowDown,
  Shield,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { useProxyStore, useProfileStore } from "@/store";
import type { TrafficData } from "@/types";

function formatSpeed(bytes: number): string {
  if (bytes === 0) return "0 B/s";
  const k = 1024;
  const sizes = ["B/s", "KB/s", "MB/s", "GB/s"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export function Layout() {
  const { t } = useTranslation();
  const { status, toggleProxy, fetchStatus, setSystemProxy, fetchTraffic } =
    useProxyStore();
  const { profiles, fetchProfiles } = useProfileStore();
  const [traffic, setTraffic] = useState<TrafficData>({ up: 0, down: 0 });
  const intervalRef = useRef<number | null>(null);

  const isRunning = status?.running ?? false;
  const activeProfile = profiles.find((p) => p.isActive);

  useEffect(() => {
    fetchStatus();
    fetchProfiles();
  }, [fetchStatus, fetchProfiles]);

  const pollTraffic = useCallback(async () => {
    if (!status?.running) return;
    const data = await fetchTraffic();
    if (data) setTraffic(data);
  }, [status?.running, fetchTraffic]);

  useEffect(() => {
    if (!isRunning) {
      setTraffic({ up: 0, down: 0 });
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    pollTraffic();
    intervalRef.current = window.setInterval(pollTraffic, 2000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, pollTraffic]);

  const handleSystemProxy = async (enable: boolean) => {
    if (isRunning) {
      await setSystemProxy(enable);
    }
  };

  const navItems = [
    { path: "/", icon: LayoutDashboard, label: t("nav.dashboard") },
    { path: "/nodes", icon: Globe, label: t("nav.nodes") },
    { path: "/profiles", icon: FileCode, label: t("nav.profiles") },
    { path: "/settings", icon: Settings, label: t("nav.settings") },
  ];

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Title bar */}
      <div className="h-10 bg-sidebar border-b flex items-center px-4 drag-region shrink-0">
        <div className="flex items-center gap-1.5 mr-4">
          <div className="w-3 h-3 rounded-full bg-red-500 opacity-80" />
          <div className="w-3 h-3 rounded-full bg-yellow-500 opacity-80" />
          <div className="w-3 h-3 rounded-full bg-green-500 opacity-80" />
        </div>
        <span className="text-sm font-semibold text-foreground/80">
          Clash Kite
        </span>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-[220px] shrink-0 bg-sidebar border-r flex flex-col">
          {/* Proxy Toggle Card */}
          <div className="p-3">
            <button
              onClick={toggleProxy}
              className={cn(
                "w-full rounded-xl p-3 flex items-center gap-3 transition-all duration-200",
                isRunning
                  ? "bg-primary/10 border border-primary/20 hover:bg-primary/15"
                  : "bg-muted border border-transparent hover:bg-muted/80",
              )}
            >
              <div
                className={cn(
                  "w-9 h-9 rounded-lg flex items-center justify-center transition-colors",
                  isRunning
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted-foreground/20 text-muted-foreground",
                )}
              >
                <Power className="h-4.5 w-4.5" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="text-sm font-semibold truncate">
                  {isRunning ? (
                    <span className="flex items-center gap-1.5">
                      <Wifi className="h-3.5 w-3.5 text-primary" />
                      {t("dashboard.running")}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <WifiOff className="h-3.5 w-3.5" />
                      {t("dashboard.stopped")}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {activeProfile?.name ?? t("dashboard.noActiveProfile")}
                </p>
              </div>
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 space-y-0.5">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground font-medium"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )
                }
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Quick Toggles */}
          <div className="px-3 pb-2 space-y-1">
            <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/50">
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                <Shield className="h-3.5 w-3.5" />
                {t("settings.systemProxy")}
              </span>
              <Switch
                checked={status?.systemProxy ?? false}
                onCheckedChange={handleSystemProxy}
                disabled={!isRunning}
                className="scale-75"
              />
            </div>
          </div>

          {/* Traffic */}
          {isRunning && (
            <div className="px-3 pb-3">
              <div className="rounded-lg bg-muted/50 px-3 py-2 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <ArrowUp className="h-3 w-3 text-success" />
                    {t("dashboard.upload")}
                  </span>
                  <span className="text-xs font-mono font-medium">
                    {formatSpeed(traffic.up)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <ArrowDown className="h-3 w-3 text-primary" />
                    {t("dashboard.download")}
                  </span>
                  <span className="text-xs font-mono font-medium">
                    {formatSpeed(traffic.down)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Mode indicator */}
          {isRunning && status?.mode && (
            <div className="px-3 pb-3">
              <div className="rounded-lg bg-muted/50 px-3 py-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Zap className="h-3.5 w-3.5" />
                  {t("dashboard.mode")}
                </span>
                <span className="text-xs font-medium capitalize">
                  {t(`dashboard.${status.mode}`)}
                </span>
              </div>
            </div>
          )}
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
