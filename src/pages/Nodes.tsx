import { useEffect, useState } from "react";
import { Search, RefreshCw, Check, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNodeStore, useProxyStore } from "@/store";
import { cn } from "@/lib/utils";

export default function Nodes() {
  const {
    groups,
    nodes,
    loading,
    fetchGroups,
    fetchAllNodes,
    searchNodes,
    testNodeLatency,
    testAllLatency,
    selectNode,
  } = useNodeStore();

  const { info } = useProxyStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [testingNodes, setTestingNodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchGroups();
    fetchAllNodes();
  }, [fetchGroups, fetchAllNodes]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      searchNodes(query);
    } else {
      fetchAllNodes();
    }
  };

  const handleTestNode = async (nodeId: string) => {
    setTestingNodes((prev) => new Set(prev).add(nodeId));
    try {
      await testNodeLatency(nodeId);
    } finally {
      setTestingNodes((prev) => {
        const next = new Set(prev);
        next.delete(nodeId);
        return next;
      });
    }
  };

  const handleTestAll = async () => {
    const allNodeIds = nodes.map((n) => n.id);
    setTestingNodes(new Set(allNodeIds));
    try {
      await testAllLatency();
    } finally {
      setTestingNodes(new Set());
    }
  };

  const handleSelectNode = async (nodeId: string) => {
    await selectNode(nodeId);
  };

  const getLatencyColor = (latency: number | null) => {
    if (latency === null) return "text-muted-foreground";
    if (latency < 100) return "text-green-500";
    if (latency < 300) return "text-yellow-500";
    return "text-red-500";
  };

  const formatLatency = (latency: number | null) => {
    if (latency === null) return "N/A";
    return `${latency}ms`;
  };

  const displayNodes = searchQuery ? nodes : nodes;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Nodes</h1>
        <Button
          variant="outline"
          onClick={handleTestAll}
          disabled={loading || testingNodes.size > 0}
        >
          {testingNodes.size > 0 ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Test All
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search nodes..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Node Groups */}
      <Tabs defaultValue={groups[0]?.name || "all"} className="w-full">
        <TabsList>
          <TabsTrigger value="all">All ({nodes.length})</TabsTrigger>
          {groups.map((group) => (
            <TabsTrigger key={group.name} value={group.name}>
              {group.name} ({group.nodes.length})
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>All Nodes</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-2">
                  {displayNodes.map((node) => (
                    <div
                      key={node.id}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg border",
                        info?.config.selectedNode === node.id &&
                          "border-primary bg-primary/5",
                      )}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="flex flex-col">
                          <span className="font-medium">{node.name}</span>
                          <span className="text-sm text-muted-foreground">
                            {node.server}:{node.port}
                          </span>
                        </div>
                        <Badge variant="outline">{node.nodeType}</Badge>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span
                          className={cn(
                            "text-sm font-mono",
                            getLatencyColor(node.latency),
                          )}
                        >
                          {formatLatency(node.latency)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleTestNode(node.id)}
                          disabled={testingNodes.has(node.id)}
                        >
                          {testingNodes.has(node.id) ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant={
                            info?.config.selectedNode === node.id
                              ? "default"
                              : "outline"
                          }
                          size="sm"
                          onClick={() => handleSelectNode(node.id)}
                        >
                          {info?.config.selectedNode === node.id ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            "Select"
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {groups.map((group) => (
          <TabsContent key={group.name} value={group.name}>
            <Card>
              <CardHeader>
                <CardTitle>{group.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-2">
                    {group.nodes.map((node) => (
                      <div
                        key={node.id}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-lg border",
                          info?.config.selectedNode === node.id &&
                            "border-primary bg-primary/5",
                        )}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="flex flex-col">
                            <span className="font-medium">{node.name}</span>
                            <span className="text-sm text-muted-foreground">
                              {node.server}:{node.port}
                            </span>
                          </div>
                          <Badge variant="outline">{node.nodeType}</Badge>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span
                            className={cn(
                              "text-sm font-mono",
                              getLatencyColor(node.latency),
                            )}
                          >
                            {formatLatency(node.latency)}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleTestNode(node.id)}
                            disabled={testingNodes.has(node.id)}
                          >
                            {testingNodes.has(node.id) ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant={
                              info?.config.selectedNode === node.id
                                ? "default"
                                : "outline"
                            }
                            size="sm"
                            onClick={() => handleSelectNode(node.id)}
                          >
                            {info?.config.selectedNode === node.id ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              "Select"
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
