import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Plus,
  Trash2,
  RefreshCw,
  FileText,
  FolderOpen,
  Check,
  Link,
} from "lucide-react";
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
import { useProfileStore, useProxyStore } from "@/store";
import { cn } from "@/lib/utils";
import { openConfigFile } from "@/api";

export default function Profiles() {
  const { t } = useTranslation();
  const {
    profiles,
    loading,
    error,
    fetchProfiles,
    importFile,
    importSubscription,
    updateSubscription,
    deleteProfile,
    activateProfile,
  } = useProfileStore();
  const { fetchStatus, fetchGroups, status } = useProxyStore();

  const [subUrl, setSubUrl] = useState("");
  const [subName, setSubName] = useState("");
  const [localName, setLocalName] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const handleImportFile = async () => {
    if (!localName.trim()) return;
    try {
      const filePath = await openConfigFile();
      if (filePath) {
        await importFile(filePath, localName);
        setLocalName("");
      }
    } catch (err) {
      console.error("Import failed:", err);
    }
  };

  const handleImportSubscription = async () => {
    if (!subUrl.trim() || !subName.trim()) return;
    try {
      await importSubscription(subUrl, subName);
      setSubUrl("");
      setSubName("");
    } catch (err) {
      console.error("Subscription import failed:", err);
    }
  };

  const handleUpdate = async (id: string) => {
    setUpdatingId(id);
    try {
      await updateSubscription(id);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm(t("profiles.deleteConfirm"))) {
      await deleteProfile(id);
    }
  };

  const handleActivate = async (id: string) => {
    await activateProfile(id);
    // Refresh proxy status after activation
    await fetchStatus();
    if (status?.running) {
      await fetchGroups();
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{t("profiles.title")}</h1>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Import Local File */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            {t("profiles.importLocalFile")}
          </CardTitle>
          <CardDescription>{t("profiles.importLocalFileDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input
              placeholder={t("profiles.profileName")}
              value={localName}
              onChange={(e) => setLocalName(e.target.value)}
              className="w-48"
            />
            <Button
              onClick={handleImportFile}
              disabled={loading || !localName.trim()}
              className="flex-1"
            >
              <FolderOpen className="mr-2 h-4 w-4" />
              {t("profiles.selectFile")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Import Subscription */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            {t("profiles.importSubscription")}
          </CardTitle>
          <CardDescription>
            {t("profiles.importSubscriptionDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input
              placeholder={t("profiles.profileName")}
              value={subName}
              onChange={(e) => setSubName(e.target.value)}
              className="w-48"
            />
            <Input
              placeholder={t("profiles.subscriptionUrl")}
              value={subUrl}
              onChange={(e) => setSubUrl(e.target.value)}
              className="flex-1"
            />
            <Button
              onClick={handleImportSubscription}
              disabled={loading || !subUrl.trim() || !subName.trim()}
            >
              <Plus className="mr-2 h-4 w-4" />
              {t("profiles.import")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Profile List */}
      <Card>
        <CardHeader>
          <CardTitle>{t("profiles.configurations")}</CardTitle>
          <CardDescription>{t("profiles.configurationsDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {profiles.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  {t("profiles.noConfigs")}
                </div>
              ) : (
                profiles.map((profile) => (
                  <div
                    key={profile.id}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-lg border transition-colors",
                      profile.isActive && "border-primary bg-primary/5",
                    )}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <FileText className="h-8 w-8 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium truncate">{profile.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {profile.source === "subscription"
                            ? t("profiles.subscription")
                            : t("profiles.localFile")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t("profiles.updatedAt")}: {formatDate(profile.updatedAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {profile.isActive && (
                        <Badge>{t("profiles.active")}</Badge>
                      )}
                      {profile.source === "subscription" && (
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleUpdate(profile.id)}
                          disabled={updatingId === profile.id}
                        >
                          <RefreshCw
                            className={cn(
                              "h-4 w-4",
                              updatingId === profile.id && "animate-spin",
                            )}
                          />
                        </Button>
                      )}
                      <Button
                        variant={profile.isActive ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleActivate(profile.id)}
                        disabled={loading || profile.isActive}
                      >
                        {profile.isActive ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          t("profiles.use")
                        )}
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleDelete(profile.id)}
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
