import { useEffect, useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Power,
  ArrowUpDown,
  ArrowDown,
  ArrowUp,
  RefreshCw,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useProxyStore, useProfileStore } from "@/store";
import { cn } from "@/lib/utils";
import type { TrafficData } from "@/types";

export default function Dashboard() {
  const { t } = useTranslation();
  const { status, loading, error, fetchStatus, toggleProxy, setMode } =
    useProxyStore();
  const { profiles, fetchProfiles } = useProfileStore();
  const [traffic, setTraffic] = useState<TrafficData>({ up: 0, down: 0 });

  useEffect(() => {
    fetchStatus();
    fetchProfiles();
  }, [fetchStatus, fetchProfiles]);

  // Poll traffic when running
  const pollTraffic = useCallback(async () => {
    if (!status?.running) return;
    const data = await useProxyStore.getState().fetchTraffic();
    if (data) setTraffic(data);
  }, [status?.running]);

  useEffect(() => {
    if (!status?.running) {
      setTraffic({ up: 0, down: 0 });
      return;
    }
    pollTraffic();
    const id = setInterval(pollTraffic, 2000);
    return () => clearInterval(id);
  }, [status?.running, pollTraffic]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const activeProfile = profiles.find((p) => p.isActive);
  const isRunning = status?.running ?? false;
  const hasActiveProfile = !!activeProfile;

  const modes = [
    { key: "rule" as const, label: t("dashboard.rule") },
    { key: "global" as const, label: t("dashboard.global") },
    { key: "direct" as const, label: t("dashboard.direct") },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t("dashboard.title")}</h1>
        <Button variant="outline" size="icon" onClick={fetchStatus}>
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}

      {!hasActiveProfile && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-700 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-400">
          {t("dashboard.noActiveProfile")}
        </div>
      )}

      {/* Power Toggle */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center space-y-4">
            <Button
              size="lg"
              variant={isRunning ? "default" : "outline"}
              className={cn(
                "h-32 w-32 rounded-full transition-all",
                isRunning && "bg-green-500 hover:bg-green-600 shadow-lg shadow-green-500/25",
              )}
              onClick={toggleProxy}
              disabled={loading || !hasActiveProfile}
            >
              <Power className="h-16 w-16" />
            </Button>
            <div className="text-center space-y-1">
              <Badge variant={isRunning ? "default" : "secondary"}>
                {isRunning ? (
                  <span className="flex items-center gap-1">
                    <Wifi className="h-3 w-3" />
                    {t("dashboard.running")}
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <WifiOff className="h-3 w-3" />
                    {t("dashboard.stopped")}
                  </span>
                )}
              </Badge>
              {status?.activeProfile && (
                <p className="text-sm text-muted-foreground">
                  {status.activeProfile}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mode Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4" />
            {t("dashboard.mode")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            {modes.map((m) => (
              <Button
                key={m.key}
                variant={status?.mode === m.key ? "default" : "outline"}
                className="flex-1"
                onClick={() => setMode(m.key)}
                disabled={!isRunning}
              >
                {m.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("dashboard.upload")}
            </CardTitle>
            <ArrowUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatBytes(traffic.up)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("dashboard.download")}
            </CardTitle>
            <ArrowDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatBytes(traffic.down)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">HTTP</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {status?.httpPort ?? 7890}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SOCKS</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {status?.socksPort ?? 7891}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
