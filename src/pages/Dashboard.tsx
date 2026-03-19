import { useEffect } from "react";
import {
  Power,
  ArrowUpDown,
  ArrowDown,
  ArrowUp,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useProxyStore } from "@/store";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const { info, loading, fetchProxyInfo, toggleProxy, restartProxy } =
    useProxyStore();

  useEffect(() => {
    fetchProxyInfo();
  }, [fetchProxyInfo]);

  const isRunning = info?.status === "running";

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <Button
          variant="outline"
          size="icon"
          onClick={restartProxy}
          disabled={loading}
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </Button>
      </div>

      {/* Main Toggle Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center space-y-4">
            <Button
              size="lg"
              variant={isRunning ? "default" : "outline"}
              className={cn(
                "h-32 w-32 rounded-full",
                isRunning && "bg-green-500 hover:bg-green-600",
              )}
              onClick={toggleProxy}
              disabled={loading}
            >
              <Power className="h-16 w-16" />
            </Button>
            <div className="text-center">
              <Badge variant={isRunning ? "success" : "secondary"}>
                {isRunning ? "Running" : "Stopped"}
              </Badge>
              {info?.startedAt && (
                <p className="text-sm text-muted-foreground mt-2">
                  Started: {new Date(info.startedAt).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mode</CardTitle>
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">
              {info?.config.mode || "Rule"}
            </div>
            <p className="text-xs text-muted-foreground">Current proxy mode</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upload</CardTitle>
            <ArrowUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatBytes(info?.upload || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total upload traffic
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Download</CardTitle>
            <ArrowDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatBytes(info?.download || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total download traffic
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Node</CardTitle>
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold truncate">
              {info?.config.selectedNode || "None"}
            </div>
            <p className="text-xs text-muted-foreground">
              Current selected node
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Port Info */}
      <Card>
        <CardHeader>
          <CardTitle>Port Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <p className="text-sm font-medium">HTTP Port</p>
              <p className="text-2xl font-bold">
                {info?.config.httpPort || 7890}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">SOCKS5 Port</p>
              <p className="text-2xl font-bold">
                {info?.config.socksPort || 7891}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Mixed Port</p>
              <p className="text-2xl font-bold">
                {info?.config.mixedPort || 7892}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
