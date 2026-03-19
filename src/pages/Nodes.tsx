import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Search, RefreshCw, Check, Loader2, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProxyStore } from "@/store";
import { cn } from "@/lib/utils";

export default function Nodes() {
  const { t } = useTranslation();
  const { status, groups, loading, fetchGroups, selectProxy, testDelay } =
    useProxyStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [testingNodes, setTestingNodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (status?.running) {
      fetchGroups();
    }
  }, [status?.running, fetchGroups]);

  const handleTestDelay = async (name: string) => {
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
  };

  const handleTestGroupAll = async (groupNodes: string[]) => {
    const newSet = new Set(groupNodes);
    setTestingNodes(newSet);
    try {
      await Promise.allSettled(groupNodes.map((n) => testDelay(n)));
    } finally {
      setTestingNodes(new Set());
    }
  };

  const handleSelect = async (group: string, name: string) => {
    await selectProxy(group, name);
  };

  if (!status?.running) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">{t("nodes.title")}</h1>
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              {t("nodes.proxyNotRunning")}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filteredGroups = searchQuery
    ? groups.map((g) => ({
        ...g,
        all: g.all.filter((n) =>
          n.toLowerCase().includes(searchQuery.toLowerCase()),
        ),
      }))
    : groups;

  // Filter out built-in groups
  const userGroups = filteredGroups.filter(
    (g) => g.name !== "GLOBAL" && g.name !== "DIRECT" && g.name !== "REJECT",
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t("nodes.title")}</h1>
        <Button
          variant="outline"
          onClick={fetchGroups}
          disabled={loading}
        >
          <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
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
          className="pl-10"
        />
      </div>

      {/* Proxy Groups */}
      {userGroups.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              {t("nodes.noNodes")}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue={userGroups[0]?.name} className="w-full">
          <TabsList className="flex-wrap h-auto">
            {userGroups.map((group) => (
              <TabsTrigger key={group.name} value={group.name}>
                {group.name} ({group.all.length})
              </TabsTrigger>
            ))}
          </TabsList>

          {userGroups.map((group) => (
            <TabsContent key={group.name} value={group.name}>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">{group.name}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{group.groupType}</Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTestGroupAll(group.all)}
                      disabled={testingNodes.size > 0}
                    >
                      <Zap className="mr-1 h-3 w-3" />
                      {t("nodes.testAll")}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[460px]">
                    <div className="space-y-2">
                      {group.all.map((nodeName) => {
                        const isSelected = group.now === nodeName;
                        const isTesting = testingNodes.has(nodeName);

                        return (
                          <div
                            key={nodeName}
                            className={cn(
                              "flex items-center justify-between p-3 rounded-lg border transition-colors",
                              isSelected && "border-primary bg-primary/5",
                              "hover:bg-muted/50",
                            )}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="font-medium truncate">
                                {nodeName}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleTestDelay(nodeName)}
                                disabled={isTesting}
                              >
                                {isTesting ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <RefreshCw className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                variant={isSelected ? "default" : "outline"}
                                size="sm"
                                onClick={() =>
                                  handleSelect(group.name, nodeName)
                                }
                              >
                                {isSelected ? (
                                  <Check className="h-4 w-4" />
                                ) : (
                                  t("nodes.select")
                                )}
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
