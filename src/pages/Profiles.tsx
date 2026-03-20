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
  Clipboard,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useProfileStore, useProxyStore } from "@/store";
import { cn } from "@/lib/utils";
import { openConfigFile } from "@/api";

function relativeTime(dateStr: string): string {
  try {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diff = now - then;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
  } catch {
    return dateStr;
  }
}

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
  const [showImport, setShowImport] = useState(false);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setSubUrl(text);
    } catch {
      // clipboard permission denied
    }
  };

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
    await fetchStatus();
    if (status?.running) {
      await fetchGroups();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("profiles.title")}</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowImport(!showImport)}
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          {t("profiles.import")}
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Import Panel */}
      {showImport && (
        <Card>
          <CardContent className="p-4 space-y-4">
            {/* Subscription Import */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Link className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {t("profiles.importSubscription")}
                </span>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder={t("profiles.profileName")}
                  value={subName}
                  onChange={(e) => setSubName(e.target.value)}
                  className="w-36 h-9"
                />
                <div className="relative flex-1">
                  <Input
                    placeholder={t("profiles.subscriptionUrl")}
                    value={subUrl}
                    onChange={(e) => setSubUrl(e.target.value)}
                    className="pr-9 h-9"
                  />
                  <button
                    onClick={handlePaste}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-accent"
                    title="Paste"
                  >
                    <Clipboard className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </div>
                <Button
                  size="sm"
                  className="h-9"
                  onClick={handleImportSubscription}
                  disabled={loading || !subUrl.trim() || !subName.trim()}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  {t("profiles.import")}
                </Button>
              </div>
            </div>

            <div className="border-t" />

            {/* Local File Import */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {t("profiles.importLocalFile")}
                </span>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder={t("profiles.profileName")}
                  value={localName}
                  onChange={(e) => setLocalName(e.target.value)}
                  className="w-36 h-9"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 flex-1"
                  onClick={handleImportFile}
                  disabled={loading || !localName.trim()}
                >
                  <FolderOpen className="mr-1.5 h-3.5 w-3.5" />
                  {t("profiles.selectFile")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Profile List */}
      <ScrollArea className="h-[calc(100vh-200px)]">
        <div className="space-y-2 pr-2">
          {profiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <FileText className="h-12 w-12 mb-4 opacity-30" />
              <p className="text-sm">{t("profiles.noConfigs")}</p>
            </div>
          ) : (
            profiles.map((profile) => {
              const isActive = profile.isActive;
              const isUpdating = updatingId === profile.id;

              return (
                <div
                  key={profile.id}
                  className={cn(
                    "group rounded-xl border bg-card p-3 transition-all duration-150",
                    isActive
                      ? "border-primary/30 bg-primary/[0.03] ring-1 ring-primary/10"
                      : "hover:border-primary/20 hover:shadow-sm",
                  )}
                >
                  <div className="flex items-center gap-3">
                    {/* Icon */}
                    <div
                      className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {profile.source === "subscription" ? (
                        <Link className="h-4.5 w-4.5" />
                      ) : (
                        <FileText className="h-4.5 w-4.5" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold truncate">
                          {profile.name}
                        </p>
                        {isActive && (
                          <Badge className="text-[10px] h-4 px-1.5">
                            {t("profiles.active")}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">
                          {profile.source === "subscription"
                            ? t("profiles.subscription")
                            : t("profiles.localFile")}
                        </span>
                        <span className="text-xs text-muted-foreground/50">
                          ·
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {relativeTime(profile.updatedAt)}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      {profile.source === "subscription" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleUpdate(profile.id)}
                          disabled={isUpdating}
                        >
                          <RefreshCw
                            className={cn(
                              "h-3.5 w-3.5",
                              isUpdating && "animate-spin",
                            )}
                          />
                        </Button>
                      )}
                      {!isActive && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleActivate(profile.id)}
                          disabled={loading}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive/70 hover:text-destructive"
                        onClick={() => handleDelete(profile.id)}
                        disabled={loading}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    {/* Active indicator / Use button */}
                    {!isActive && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => handleActivate(profile.id)}
                        disabled={loading}
                      >
                        {t("profiles.use")}
                      </Button>
                    )}
                    {isActive && (
                      <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
