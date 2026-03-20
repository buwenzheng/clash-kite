import { useEffect, useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Search,
  RefreshCw,
  Check,
  Loader2,
  Zap,
  ChevronDown,
  ChevronRight,
  Signal,
  ArrowUpDown,
  Clock,
  ArrowDownAZ,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useProxyStore } from "@/store";
import { testProxyDelay } from "@/api";
import { cn } from "@/lib/utils";
import type { ProxyNode } from "@/types";

type SortMode = "default" | "delay" | "name";

const NODE_TYPE_LABELS: Record<string, string> = {
  Shadowsocks: "SS",
  ShadowsocksR: "SSR",
  VMess: "VMess",
  VLESS: "VLESS",
  Trojan: "Trojan",
  Hysteria: "Hy",
  Hysteria2: "Hy2",
  WireGuard: "WG",
  Tuic: "TUIC",
  Ssh: "SSH",
  Http: "HTTP",
  Socks5: "SOCKS5",
  Direct: "DIRECT",
  Reject: "REJECT",
};

function getNodeTypeLabel(nodeType: string): string {
  return NODE_TYPE_LABELS[nodeType] ?? nodeType;
}

function getLatestDelay(node: ProxyNode): number | null {
  if (node.history.length === 0) return null;
  const last = node.history[node.history.length - 1];
  return last.delay;
}

function getDelayColor(node: ProxyNode): string {
  const delay = getLatestDelay(node);
  if (delay === null) return "text-muted-foreground";
  if (delay === 0) return "text-red-500";
  if (delay < 200) return "text-green-500";
  if (delay < 500) return "text-yellow-500";
  return "text-orange-500";
}

function getDelayText(node: ProxyNode): string {
  const delay = getLatestDelay(node);
  if (delay === null) return "--";
  if (delay === 0) return "timeout";
  return `${delay}ms`;
}

function getDelayBgColor(node: ProxyNode): string {
  const delay = getLatestDelay(node);
  if (delay === null) return "bg-muted-foreground/10";
  if (delay === 0) return "bg-red-500/10";
  if (delay < 200) return "bg-green-500/10";
  if (delay < 500) return "bg-yellow-500/10";
  return "bg-orange-500/10";
}

function sortByDelay(nodes: ProxyNode[]): ProxyNode[] {
  return [...nodes].sort((a, b) => {
    const da = getLatestDelay(a);
    const db = getLatestDelay(b);
    if (da === null && db === null) return 0;
    if (da === null) return 1;
    if (db === null) return -1;
    if (da === 0 && db === 0) return 0;
    if (da === 0) return 1;
    if (db === 0) return -1;
    return da - db;
  });
}

function sortByName(nodes: ProxyNode[]): ProxyNode[] {
  return [...nodes].sort((a, b) => a.name.localeCompare(b.name));
}

async function testDelayWithConcurrency(
  nodes: string[],
  concurrency: number,
  testFn: (name: string) => Promise<void>,
): Promise<void> {
  let index = 0;

  async function worker() {
    while (index < nodes.length) {
      const current = index++;
      await testFn(nodes[current]);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, nodes.length) },
    () => worker(),
  );
  await Promise.allSettled(workers);
}

const SORT_ICONS = {
  default: ArrowUpDown,
  delay: Clock,
  name: ArrowDownAZ,
} as const;

const SORT_CYCLE: SortMode[] = ["default", "delay", "name"];

export default function Nodes() {
  const { t } = useTranslation();
  const { status, groups, loading, fetchGroups, selectProxy, testDelay } =
    useProxyStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [testingNodes, setTestingNodes] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [sortMode, setSortMode] = useState<SortMode>("default");

  useEffect(() => {
    if (status?.running) {
      fetchGroups();
    }
  }, [status?.running, fetchGroups]);

  const handleTestDelay = useCallback(
    async (name: string) => {
      setTestingNodes((prev) => new Set(prev).add(name));
      try {
        await testDelay(name);
      } finally {
        setTestingNodes((prev) => {
          const next = new Set(prev);
          next.delete(name);
          return next;
        });
      }
    },
    [testDelay],
  );

  const handleTestGroupAll = useCallback(
    async (groupNodes: string[]) => {
      const newSet = new Set(groupNodes);
      setTestingNodes(newSet);
      try {
        await testDelayWithConcurrency(groupNodes, 50, async (name) => {
          try {
            await testProxyDelay(name);
          } catch {
            // individual failure doesn't affect others
          }
          setTestingNodes((prev) => {
            const next = new Set(prev);
            next.delete(name);
            return next;
          });
        });
      } finally {
        setTestingNodes(new Set());
        await fetchGroups();
      }
    },
    [fetchGroups],
  );

  const handleSelect = useCallback(
    async (group: string, name: string) => {
      await selectProxy(group, name);
    },
    [selectProxy],
  );

  const toggleCollapse = (name: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const cycleSortMode = () => {
    setSortMode((prev) => {
      const idx = SORT_CYCLE.indexOf(prev);
      return SORT_CYCLE[(idx + 1) % SORT_CYCLE.length];
    });
  };

  const userGroups = useMemo(() => {
    return groups.filter(
      (g) => g.name !== "GLOBAL" && g.name !== "DIRECT" && g.name !== "REJECT",
    );
  }, [groups]);

  const getFilteredAndSortedNodes = useCallback(
    (nodes: ProxyNode[]) => {
      let result = nodes;
      if (searchQuery) {
        result = result.filter((n) =>
          n.name.toLowerCase().includes(searchQuery.toLowerCase()),
        );
      }
      switch (sortMode) {
        case "delay":
          return sortByDelay(result);
        case "name":
          return sortByName(result);
        default:
          return result;
      }
    },
    [searchQuery, sortMode],
  );

  const SortIcon = SORT_ICONS[sortMode];
  const sortLabel = t(`nodes.sort${sortMode.charAt(0).toUpperCase() + sortMode.slice(1)}`);

  if (!status?.running) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">{t("nodes.title")}</h1>
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Signal className="h-12 w-12 mb-4 opacity-30" />
          <p className="text-sm">{t("nodes.proxyNotRunning")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("nodes.title")}</h1>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={cycleSortMode}
            title={sortLabel}
          >
            <SortIcon className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" size="sm" onClick={fetchGroups} disabled={loading}>
            <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", loading && "animate-spin")} />
            {t("nodes.refresh")}
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t("nodes.searchPlaceholder")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-9"
        />
      </div>

      {/* Groups */}
      <ScrollArea className="h-[calc(100vh-200px)]">
        <div className="space-y-3 pr-2">
          {userGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Signal className="h-12 w-12 mb-4 opacity-30" />
              <p className="text-sm">{t("nodes.noNodes")}</p>
            </div>
          ) : (
            userGroups.map((group) => {
              const isCollapsed = collapsed.has(group.name);
              const filteredNodes = getFilteredAndSortedNodes(group.nodes);

              return (
                <div key={group.name} className="rounded-xl border bg-card overflow-hidden">
                  {/* Group header */}
                  <button
                    onClick={() => toggleCollapse(group.name)}
                    className="w-full flex items-center justify-between p-3 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {isCollapsed ? (
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                      <span className="font-semibold text-sm truncate">
                        {group.name}
                      </span>
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {group.groupType}
                      </Badge>
                      <span className="text-xs text-muted-foreground shrink-0">
                        ({filteredNodes.length})
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {group.now && (
                        <span className="text-xs text-primary font-medium truncate max-w-[120px]">
                          {group.now}
                        </span>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleTestGroupAll(group.all)}
                        disabled={testingNodes.size > 0}
                      >
                        <Zap className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </button>

                  {/* Nodes grid */}
                  {!isCollapsed && (
                    <div className="px-3 pb-3">
                      <div className="grid grid-cols-2 xl:grid-cols-3 gap-2">
                        {filteredNodes.map((node) => {
                          const isSelected = group.now === node.name;
                          const isTesting = testingNodes.has(node.name);
                          return (
                            <button
                              key={node.name}
                              onClick={() => handleSelect(group.name, node.name)}
                              className={cn(
                                "relative p-2.5 rounded-lg border text-left transition-all duration-150",
                                "hover:shadow-sm",
                                isSelected
                                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                                  : "border-border hover:border-primary/30",
                              )}
                            >
                              <div className="flex items-start justify-between gap-1">
                                <span className="text-xs font-medium leading-tight line-clamp-2 flex-1">
                                  {node.name}
                                </span>
                                {isSelected && (
                                  <Check className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                                )}
                              </div>
                              <div className="flex items-center justify-between mt-2">
                                <div className="flex items-center gap-1">
                                  <span
                                    className={cn(
                                      "text-[10px] font-mono px-1.5 py-0.5 rounded",
                                      getDelayBgColor(node),
                                      getDelayColor(node),
                                    )}
                                  >
                                    {getDelayText(node)}
                                  </span>
                                  <Badge
                                    variant="secondary"
                                    className="text-[9px] px-1 py-0 h-4 font-normal"
                                  >
                                    {getNodeTypeLabel(node.nodeType)}
                                  </Badge>
                                </div>
                                <button
                                  className="p-0.5 rounded hover:bg-accent"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleTestDelay(node.name);
                                  }}
                                  disabled={isTesting}
                                >
                                  {isTesting ? (
                                    <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                                  ) : (
                                    <RefreshCw className="h-3 w-3 text-muted-foreground" />
                                  )}
                                </button>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
