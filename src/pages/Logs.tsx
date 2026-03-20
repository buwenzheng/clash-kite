import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Search, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useProxyStore } from "@/store";
import * as api from "@/api";

type LogLevel = "debug" | "info" | "warning" | "error";
type LogLevelFilter = LogLevel | "all";

const BUFFER_LIMIT = 2000;
const POLL_INTERVAL_MS = 2000;

export default function Logs() {
  const { t } = useTranslation();
  const { status } = useProxyStore();

  const [level, setLevel] = useState<LogLevelFilter>("all");
  const [search, setSearch] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);
  const [buffer, setBuffer] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const atBottomRef = useRef(true);

  const loadLogs = useCallback(async () => {
    try {
      setError(null);
      const text = await api.getMihomoLog(BUFFER_LIMIT, level);
      const lines = text ? text.split("\n") : [];
      setBuffer(lines);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [level]);

  useEffect(() => {
    // Level 切换时立刻加载一次（即使代理尚未运行）
    loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    if (!status?.running) return;
    const id = window.setInterval(() => {
      loadLogs();
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [status?.running, loadLogs]);

  const filteredLines = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return buffer;
    return buffer.filter((l) => l.toLowerCase().includes(q));
  }, [buffer, search]);

  const displayText = useMemo(() => filteredLines.join("\n"), [filteredLines]);

  const scrollToBottom = () => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  };

  // buffer 更新时，根据 atBottomRef 与 autoScroll 决定是否自动滚动
  useEffect(() => {
    if (!autoScroll) return;
    if (atBottomRef.current) scrollToBottom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayText, autoScroll]);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
    const isAtBottom = remaining < 16;
    atBottomRef.current = isAtBottom;
  };

  const levels: { value: LogLevelFilter; label: string }[] = useMemo(
    () => [
      { value: "all", label: t("logs.level.all") },
      { value: "debug", label: t("logs.level.debug") },
      { value: "info", label: t("logs.level.info") },
      { value: "warning", label: t("logs.level.warning") },
      { value: "error", label: t("logs.level.error") },
    ],
    [t],
  );

  const handleClear = () => {
    setBuffer([]);
    setSearch("");
    setError(null);
    atBottomRef.current = true;
    // 清空后把滚动条归位，避免停在“旧内容位置”
    requestAnimationFrame(() => {
      const el = containerRef.current;
      if (el) el.scrollTop = 0;
    });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("logs.title")}</h1>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-semibold">{t("logs.level.title")}</Label>
            <div className="grid gap-2 grid-cols-2 md:grid-cols-5">
              {levels.map((opt) => (
                <Button
                  key={opt.value}
                  type="button"
                  variant={opt.value === level ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "h-9",
                    opt.value === level
                      ? "border-primary"
                      : "border-border hover:border-primary/30",
                  )}
                  onClick={() => setLevel(opt.value)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="flex-1 space-y-2">
              <Label className="text-sm font-semibold">{t("common.search")}</Label>
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder={t("logs.searchPlaceholder")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Switch checked={autoScroll} onCheckedChange={setAutoScroll} />
                <Label className="text-sm">{t("logs.autoScroll")}</Label>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClear}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                {t("logs.clear")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          {error ? (
            <div className="text-sm text-destructive">{error}</div>
          ) : null}
          <div
            ref={containerRef}
            onScroll={handleScroll}
            className="mt-3 h-[560px] overflow-auto rounded-md border bg-card p-3"
          >
            {filteredLines.length === 0 ? (
              <div className="text-sm text-muted-foreground">{t("logs.noData")}</div>
            ) : (
              <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-5">
                {displayText}
              </pre>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

