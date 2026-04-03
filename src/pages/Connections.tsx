import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Search,
  XCircle,
  Trash2,
  List,
  Table2,
  ArrowUp,
  ArrowDown,
  Wifi,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useConnectionsStore, useProxyStore } from "@/store";
import type { ConnectionItem } from "@/types";

const POLL_INTERVAL_MS = 2000;

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m < 60) return `${m}m ${r}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

export default function Connections() {
  const { t } = useTranslation();
  const { status } = useProxyStore();
  const {
    connections,
    loading,
    error,
    activeTab,
    search,
    sortBy,
    viewMode,
    fetchSnapshot,
    closeConnection,
    closeAllConnections,
    setActiveTab,
    setSearch,
    setSortBy,
    setViewMode,
    reset,
  } = useConnectionsStore();

  const [closeConfirmId, setCloseConfirmId] = useState<string | null>(null);
  const [closeAllConfirm, setCloseAllConfirm] = useState(false);

  const isRunning = status?.running ?? false;
  const timerRef = useRef<number | null>(null);

  // Start polling when proxy runs, stop when it stops
  useEffect(() => {
    if (!isRunning) {
      reset();
      return;
    }
    fetchSnapshot();
    timerRef.current = window.setInterval(() => {
      fetchSnapshot();
    }, POLL_INTERVAL_MS);
    return () => {
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning]);

  const filteredConnections = useMemo(() => {
    let list = [...connections];

    // Tab filter
    list = activeTab === "active"
      ? list.filter((c) => c.state === "active")
      : list.filter((c) => c.state === "closed");

    // Search
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (c) =>
          c.dst.toLowerCase().includes(q) ||
          c.src.toLowerCase().includes(q) ||
          c.proxy.toLowerCase().includes(q) ||
          c.protocol.toLowerCase().includes(q),
      );
    }

    // Sort
    if (sortBy === "traffic") {
      list.sort(
        (a, b) =>
          b.uploadBytes + b.downloadBytes - (a.uploadBytes + a.downloadBytes),
      );
    } else if (sortBy === "duration") {
      list.sort((a, b) => b.duration - a.duration);
    }

    return list;
  }, [connections, activeTab, search, sortBy]);

  const handleCloseConnection = async (id: string) => {
    await closeConnection(id);
    setCloseConfirmId(null);
  };

  const handleCloseAll = async () => {
    await closeAllConnections();
    setCloseAllConfirm(false);
  };

  if (!isRunning) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t("connections.title")}</h1>
        <Card>
          <CardContent className="p-8 flex flex-col items-center justify-center gap-3">
            <Wifi className="h-10 w-10 text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground">
              {t("connections.proxyNotRunning")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("connections.title")}</h1>

      {/* Controls */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            {/* Tabs */}
            <div className="flex gap-1">
              {(["active", "closed"] as const).map((tab) => (
                <Button
                  key={tab}
                  type="button"
                  variant={activeTab === tab ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveTab(tab)}
                  className="gap-1.5"
                >
                  {tab === "active"
                    ? t("connections.tabActive")
                    : t("connections.tabClosed")}
                  <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-xs font-normal">
                    {connections.filter((c) =>
                      tab === "active" ? c.state === "active" : c.state === "closed",
                    ).length}
                  </span>
                </Button>
              ))}
            </div>

            {/* Search */}
            <div className="flex-1 md:max-w-xs">
              <Label className="mb-1 block text-xs text-muted-foreground">
                {t("common.search")}
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder={t("connections.searchPlaceholder")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Sort + view row */}
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">
                {t("connections.sort")}:
              </Label>
              <div className="flex gap-1">
                {(["default", "traffic", "duration"] as const).map((s) => (
                  <Button
                    key={s}
                    type="button"
                    variant={sortBy === s ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setSortBy(s)}
                  >
                    {t(`connections.sort${s.charAt(0).toUpperCase() + s.slice(1)}`)}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* View toggle */}
              <div className="flex overflow-hidden rounded-md border">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn("h-7 rounded-none px-2", viewMode === "list" && "bg-muted")}
                  onClick={() => setViewMode("list")}
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn("h-7 rounded-none px-2", viewMode === "table" && "bg-muted")}
                  onClick={() => setViewMode("table")}
                >
                  <Table2 className="h-4 w-4" />
                </Button>
              </div>

              {activeTab === "active" &&
                connections.filter((c) => c.state === "active").length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-destructive hover:text-destructive"
                    onClick={() => setCloseAllConfirm(true)}
                  >
                    <Trash2 className="h-4 w-4" />
                    {t("connections.closeAll")}
                  </Button>
                )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <div className="px-1 text-sm text-destructive">{error}</div>
      )}

      {/* Connection list */}
      <Card>
        <CardContent className="p-0">
          {loading && filteredConnections.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              {t("common.loading")}
            </div>
          ) : filteredConnections.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              {t("connections.noData")}
            </div>
          ) : viewMode === "list" ? (
            <ListView
              connections={filteredConnections}
              onClose={setCloseConfirmId}
            />
          ) : (
            <TableView
              connections={filteredConnections}
              onClose={setCloseConfirmId}
            />
          )}
        </CardContent>
      </Card>

      {/* Close single dialog */}
      <AlertDialog
        open={closeConfirmId !== null}
        onOpenChange={(open) => !open && setCloseConfirmId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("connections.closeConfirm")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("connections.closeConfirmDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => closeConfirmId && handleCloseConnection(closeConfirmId)}
            >
              {t("connections.close")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Close all dialog */}
      <AlertDialog
        open={closeAllConfirm}
        onOpenChange={setCloseAllConfirm}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("connections.closeAllConfirm")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("connections.closeAllConfirmDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleCloseAll}
            >
              {t("connections.closeAll")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ListView({
  connections,
  onClose,
}: {
  connections: ConnectionItem[];
  onClose: (id: string) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="divide-y">
      {connections.map((conn) => (
        <div
          key={conn.id}
          className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/30"
        >
          <div className="mt-0.5 shrink-0">
            <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
              {conn.protocol}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-mono text-sm">{conn.dst}</div>
            <div className="mt-0.5 flex gap-3 text-xs text-muted-foreground">
              <span>
                <span className="font-medium">{t("connections.src")}:</span> {conn.src}
              </span>
              <span>
                <span className="font-medium">{t("connections.proxy")}:</span> {conn.proxy}
              </span>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="space-y-0.5 text-xs">
              <div className="flex items-center justify-end gap-1.5">
                <ArrowUp className="h-3 w-3 text-success" />
                <span className="font-mono">{formatBytes(conn.uploadBytes)}</span>
              </div>
              <div className="flex items-center justify-end gap-1.5">
                <ArrowDown className="h-3 w-3 text-primary" />
                <span className="font-mono">{formatBytes(conn.downloadBytes)}</span>
              </div>
              <div className="text-muted-foreground">{formatDuration(conn.duration)}</div>
            </div>
          </div>
          {conn.state === "active" && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 shrink-0 p-0 text-muted-foreground hover:text-destructive"
              onClick={() => onClose(conn.id)}
            >
              <XCircle className="h-4 w-4" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}

function TableView({
  connections,
  onClose,
}: {
  connections: ConnectionItem[];
  onClose: (id: string) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="overflow-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/30">
            <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">
              {t("connections.protocol")}
            </th>
            <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">
              {t("connections.dst")}
            </th>
            <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">
              {t("connections.src")}
            </th>
            <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">
              {t("connections.proxy")}
            </th>
            <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">
              <span className="inline-flex items-center gap-0.5">
                <ArrowUp className="h-3 w-3" />
                {t("connections.upload")}
              </span>
            </th>
            <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">
              <span className="inline-flex items-center gap-0.5">
                <ArrowDown className="h-3 w-3" />
                {t("connections.download")}
              </span>
            </th>
            <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">
              {t("connections.duration")}
            </th>
            <th className="w-10 px-4 py-2" />
          </tr>
        </thead>
        <tbody className="divide-y">
          {connections.map((conn) => (
            <tr
              key={conn.id}
              className="transition-colors hover:bg-muted/30"
            >
              <td className="px-4 py-2">
                <span className="inline-flex rounded bg-muted px-1.5 py-0.5 text-xs font-medium">
                  {conn.protocol}
                </span>
              </td>
              <td className="max-w-[200px] truncate px-4 py-2 font-mono text-xs">
                {conn.dst}
              </td>
              <td className="max-w-[140px] truncate px-4 py-2 font-mono text-xs text-muted-foreground">
                {conn.src}
              </td>
              <td className="max-w-[120px] truncate px-4 py-2 text-xs">
                {conn.proxy}
              </td>
              <td className="px-4 py-2 text-right font-mono text-xs">
                {formatBytes(conn.uploadBytes)}
              </td>
              <td className="px-4 py-2 text-right font-mono text-xs">
                {formatBytes(conn.downloadBytes)}
              </td>
              <td className="px-4 py-2 text-right text-xs text-muted-foreground">
                {formatDuration(conn.duration)}
              </td>
              <td className="px-4 py-2">
                {conn.state === "active" && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => onClose(conn.id)}
                  >
                    <XCircle className="h-3.5 w-3.5" />
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
