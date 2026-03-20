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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useProxyStore } from "@/store";
import { cn } from "@/lib/utils";

export default function Nodes() {
  const { t } = useTranslation();
  const { status, groups, loading, fetchGroups, selectProxy, testDelay } =
    useProxyStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [testingNodes, setTestingNodes] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

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
        await Promise.allSettled(groupNodes.map((n) => testDelay(n)));
      } finally {
        setTestingNodes(new Set());
      }
    },
    [testDelay],
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

  const userGroups = useMemo(() => {
    return groups.filter(
      (g) => g.name !== "GLOBAL" && g.name !== "DIRECT" && g.name !== "REJECT",
    );
  }, [groups]);

  const getFilteredNodes = useCallback(
    (allNodes: string[]) => {
      if (!searchQuery) return allNodes;
      return allNodes.filter((n) =>
        n.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    },
    [searchQuery],
  );

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
        <Button variant="outline" size="sm" onClick={fetchGroups} disabled={loading}>
          <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", loading && "animate-spin")} />
          {t("nodes.refresh")}
        </Button>
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
              const filteredNodes = getFilteredNodes(group.all);

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
                        {filteredNodes.length}
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
                        {filteredNodes.map((nodeName) => {
                          const isSelected = group.now === nodeName;
                          const isTesting = testingNodes.has(nodeName);
                          return (
                            <button
                              key={nodeName}
                              onClick={() => handleSelect(group.name, nodeName)}
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
                                  {nodeName}
                                </span>
                                {isSelected && (
                                  <Check className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                                )}
                              </div>
                              <div className="flex items-center justify-between mt-2">
                                <span
                                  className={cn(
                                    "text-[10px] font-mono px-1.5 py-0.5 rounded",
                                    "bg-muted-foreground/10 text-muted-foreground",
                                  )}
                                >
                                  --
                                </span>
                                <button
                                  className="p-0.5 rounded hover:bg-accent"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleTestDelay(nodeName);
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
