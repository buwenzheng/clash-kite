import { useEffect, useState } from "react";
import { Plus, Trash2, RefreshCw, FileText } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useConfigStore } from "@/store";
import { cn } from "@/lib/utils";

export default function Profiles() {
  const {
    currentConfig,
    configs,
    loading,
    fetchCurrentConfig,
    fetchAllConfigs,
    importFromSubscription,
    updateSubscription,
    deleteConfig,
    setCurrentConfig,
  } = useConfigStore();

  const [subscriptionUrl, setSubscriptionUrl] = useState("");
  const [subscriptionName, setSubscriptionName] = useState("");

  useEffect(() => {
    fetchCurrentConfig();
    fetchAllConfigs();
  }, [fetchCurrentConfig, fetchAllConfigs]);

  const handleImportSubscription = async () => {
    if (!subscriptionUrl.trim() || !subscriptionName.trim()) return;

    try {
      await importFromSubscription(subscriptionUrl, subscriptionName);
      setSubscriptionUrl("");
      setSubscriptionName("");
    } catch (error) {
      console.error("Failed to import subscription:", error);
    }
  };

  const handleUpdateSubscription = async (configId: string) => {
    try {
      await updateSubscription(configId);
    } catch (error) {
      console.error("Failed to update subscription:", error);
    }
  };

  const handleDeleteConfig = async (configId: string) => {
    if (confirm("Are you sure you want to delete this configuration?")) {
      try {
        await deleteConfig(configId);
      } catch (error) {
        console.error("Failed to delete config:", error);
      }
    }
  };

  const handleSelectConfig = async (config: (typeof configs)[0]) => {
    try {
      await setCurrentConfig(config);
    } catch (error) {
      console.error("Failed to select config:", error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Profiles</h1>
      </div>

      {/* Import Subscription */}
      <Card>
        <CardHeader>
          <CardTitle>Import Subscription</CardTitle>
          <CardDescription>
            Add a new subscription URL to import proxy configurations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4">
            <div className="flex space-x-4">
              <Input
                placeholder="Profile name"
                value={subscriptionName}
                onChange={(e) => setSubscriptionName(e.target.value)}
                className="w-1/4"
              />
              <Input
                placeholder="Subscription URL"
                value={subscriptionUrl}
                onChange={(e) => setSubscriptionUrl(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={handleImportSubscription}
                disabled={
                  loading || !subscriptionUrl.trim() || !subscriptionName.trim()
                }
              >
                <Plus className="mr-2 h-4 w-4" />
                Import
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Config List */}
      <Card>
        <CardHeader>
          <CardTitle>Configurations</CardTitle>
          <CardDescription>Manage your proxy configurations</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="space-y-4">
              {configs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No configurations yet. Import a subscription to get started.
                </div>
              ) : (
                configs.map((config) => (
                  <div
                    key={config.id}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-lg border",
                      currentConfig?.id === config.id &&
                        "border-primary bg-primary/5",
                    )}
                  >
                    <div className="flex items-center space-x-4">
                      <FileText className="h-8 w-8 text-muted-foreground" />
                      <div className="flex flex-col">
                        <span className="font-medium">{config.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {config.source === "Subscription"
                            ? "Subscription"
                            : "Local File"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Updated: {formatDate(config.updatedAt)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {currentConfig?.id === config.id && (
                        <Badge variant="success">Active</Badge>
                      )}
                      {config.source === "Subscription" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdateSubscription(config.id)}
                          disabled={loading}
                        >
                          <RefreshCw
                            className={cn("h-4 w-4", loading && "animate-spin")}
                          />
                        </Button>
                      )}
                      <Button
                        variant={
                          currentConfig?.id === config.id
                            ? "default"
                            : "outline"
                        }
                        size="sm"
                        onClick={() => handleSelectConfig(config)}
                        disabled={loading}
                      >
                        {currentConfig?.id === config.id ? "Active" : "Use"}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteConfig(config.id)}
                        disabled={loading}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
