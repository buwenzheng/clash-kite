import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowUpDown,
  Server,
  Activity,
  Radio,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useProxyStore, useProfileStore } from "@/store";
import { cn } from "@/lib/utils";
import type { ProxyMode } from "@/types";

export default function Dashboard() {
  const { t } = useTranslation();
  const { status, fetchStatus, setMode } = useProxyStore();
  const { profiles, fetchProfiles } = useProfileStore();

  useEffect(() => {
    fetchStatus();
    fetchProfiles();
  }, [fetchStatus, fetchProfiles]);

  const isRunning = status?.running ?? false;
  const activeProfile = profiles.find((p) => p.isActive);

  const modes: { key: ProxyMode; label: string; desc: string }[] = [
    {
      key: "rule",
      label: t("dashboard.rule"),
      desc: t("dashboard.ruleDesc"),
    },
    {
      key: "global",
      label: t("dashboard.global"),
      desc: t("dashboard.globalDesc"),
    },
    {
      key: "direct",
      label: t("dashboard.direct"),
      desc: t("dashboard.directDesc"),
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("dashboard.title")}</h1>

      {/* Status Overview */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        {/* Active Profile */}
        <Card className="relative overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t("dashboard.activeConfig")}
                </p>
                <p className="text-lg font-semibold truncate">
                  {activeProfile?.name ?? "--"}
                </p>
                <Badge
                  variant={
                    activeProfile?.source === "subscription"
                      ? "default"
                      : "secondary"
                  }
                  className="text-[10px]"
                >
                  {activeProfile
                    ? activeProfile.source === "subscription"
                      ? t("profiles.subscription")
                      : t("profiles.localFile")
                    : t("dashboard.none")}
                </Badge>
              </div>
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Server className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ports */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t("dashboard.portConfig")}
                </p>
                <div className="flex items-center gap-3 mt-1">
                  <div>
                    <span className="text-xs text-muted-foreground">HTTP</span>
                    <p className="text-lg font-semibold font-mono">
                      {status?.httpPort ?? "--"}
                    </p>
                  </div>
                  <div className="w-px h-8 bg-border" />
                  <div>
                    <span className="text-xs text-muted-foreground">SOCKS</span>
                    <p className="text-lg font-semibold font-mono">
                      {status?.socksPort ?? "--"}
                    </p>
                  </div>
                  <div className="w-px h-8 bg-border" />
                  <div>
                    <span className="text-xs text-muted-foreground">Mixed</span>
                    <p className="text-lg font-semibold font-mono">
                      {status?.mixedPort ?? "--"}
                    </p>
                  </div>
                </div>
              </div>
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Radio className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t("dashboard.proxyStatus")}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <div
                    className={cn(
                      "w-2.5 h-2.5 rounded-full",
                      isRunning ? "bg-success animate-pulse" : "bg-muted-foreground/30",
                    )}
                  />
                  <p className="text-lg font-semibold">
                    {isRunning ? t("dashboard.running") : t("dashboard.stopped")}
                  </p>
                </div>
                {status?.systemProxy && (
                  <Badge variant="outline" className="text-[10px]">
                    {t("settings.systemProxy")}
                  </Badge>
                )}
              </div>
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Activity className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mode Selector */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">{t("dashboard.mode")}</h2>
        </div>
        <div className="grid gap-3 grid-cols-3">
          {modes.map((m) => (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              disabled={!isRunning}
              className={cn(
                "p-4 rounded-xl border text-left transition-all duration-200",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                status?.mode === m.key
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                  : "border-border hover:border-primary/30 hover:bg-accent/50",
              )}
            >
              <p className="text-sm font-semibold">{m.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{m.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Quick Info */}
      {!activeProfile && (
        <Card className="border-dashed">
          <CardContent className="p-6 text-center">
            <p className="text-sm text-muted-foreground">
              {t("dashboard.noActiveProfile")}
            </p>
            <Button variant="outline" size="sm" className="mt-3" asChild>
              <a href="/profiles">{t("nav.profiles")}</a>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
