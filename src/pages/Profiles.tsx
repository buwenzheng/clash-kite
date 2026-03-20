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
  Pencil,
  Download,
  Code,
  Timer,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useProfileStore, useProxyStore } from "@/store";
import { cn } from "@/lib/utils";
import {
  openConfigFile,
  saveConfigFile,
  readProfileContent,
  saveProfileContent,
  exportProfile,
} from "@/api";
import type { ProfileInfo } from "@/types";

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

function formatInterval(minutes: number, t: (key: string) => string): string {
  if (minutes >= 60 && minutes % 60 === 0) {
    return `${minutes / 60}${t("profiles.hours")}`;
  }
  return `${minutes}${t("profiles.minutes")}`;
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
    updateProfileInfo,
    deleteProfile,
    activateProfile,
    setAutoUpdate,
    updateAllAutoUpdate,
  } = useProfileStore();
  const { fetchStatus, fetchGroups, status } = useProxyStore();

  const [subUrl, setSubUrl] = useState("");
  const [subName, setSubName] = useState("");
  const [localName, setLocalName] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [updatingAll, setUpdatingAll] = useState(false);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<ProfileInfo | null>(null);

  // Edit profile info state
  const [editTarget, setEditTarget] = useState<ProfileInfo | null>(null);
  const [editName, setEditName] = useState("");
  const [editSubUrl, setEditSubUrl] = useState("");

  // YAML editor state
  const [yamlTarget, setYamlTarget] = useState<ProfileInfo | null>(null);
  const [yamlContent, setYamlContent] = useState("");
  const [yamlLoading, setYamlLoading] = useState(false);
  const [yamlError, setYamlError] = useState<string | null>(null);

  // Auto-update settings state
  const [autoUpdateTarget, setAutoUpdateTarget] = useState<ProfileInfo | null>(null);
  const [autoUpdateEnabled, setAutoUpdateEnabled] = useState(false);
  const [autoUpdateInterval, setAutoUpdateInterval] = useState(480);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const hasAutoUpdateProfiles = profiles.some(
    (p) => p.autoUpdate && p.source === "subscription",
  );

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

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    await deleteProfile(deleteTarget.id);
    setDeleteTarget(null);
  };

  const handleActivate = async (id: string) => {
    await activateProfile(id);
    await fetchStatus();
    if (status?.running) {
      await fetchGroups();
    }
  };

  const openEditDialog = (profile: ProfileInfo) => {
    setEditTarget(profile);
    setEditName(profile.name);
    setEditSubUrl(profile.subscriptionUrl ?? "");
  };

  const handleEditSave = async () => {
    if (!editTarget || !editName.trim()) return;
    try {
      await updateProfileInfo(
        editTarget.id,
        editName,
        editTarget.source === "subscription" ? editSubUrl || null : null,
      );
      setEditTarget(null);
    } catch (err) {
      console.error("Update failed:", err);
    }
  };

  const openYamlEditor = async (profile: ProfileInfo) => {
    setYamlTarget(profile);
    setYamlLoading(true);
    setYamlError(null);
    try {
      const content = await readProfileContent(profile.id);
      setYamlContent(content);
    } catch (err) {
      setYamlError(String(err));
    } finally {
      setYamlLoading(false);
    }
  };

  const handleYamlSave = async () => {
    if (!yamlTarget) return;
    setYamlLoading(true);
    setYamlError(null);
    try {
      await saveProfileContent(yamlTarget.id, yamlContent);
      await fetchProfiles();
      setYamlTarget(null);
    } catch (err) {
      setYamlError(String(err));
    } finally {
      setYamlLoading(false);
    }
  };

  const handleExport = async (profile: ProfileInfo) => {
    try {
      const destPath = await saveConfigFile(`${profile.name}.yaml`);
      if (destPath) {
        await exportProfile(profile.id, destPath);
      }
    } catch (err) {
      console.error("Export failed:", err);
    }
  };

  const openAutoUpdateDialog = (profile: ProfileInfo) => {
    setAutoUpdateTarget(profile);
    setAutoUpdateEnabled(profile.autoUpdate);
    setAutoUpdateInterval(profile.autoUpdateInterval);
  };

  const handleAutoUpdateSave = async () => {
    if (!autoUpdateTarget) return;
    try {
      await setAutoUpdate(autoUpdateTarget.id, autoUpdateEnabled, autoUpdateInterval);
      setAutoUpdateTarget(null);
    } catch (err) {
      console.error("Auto-update settings failed:", err);
    }
  };

  const handleUpdateAll = async () => {
    setUpdatingAll(true);
    try {
      await updateAllAutoUpdate();
    } catch (err) {
      console.error("Update all failed:", err);
    } finally {
      setUpdatingAll(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("profiles.title")}</h1>
        <div className="flex items-center gap-2">
          {hasAutoUpdateProfiles && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleUpdateAll}
              disabled={updatingAll}
            >
              <RefreshCw
                className={cn(
                  "mr-1.5 h-3.5 w-3.5",
                  updatingAll && "animate-spin",
                )}
              />
              {updatingAll
                ? t("profiles.updatingAll")
                : t("profiles.updateAll")}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowImport(!showImport)}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            {t("profiles.import")}
          </Button>
        </div>
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
                        {profile.autoUpdate &&
                          profile.source === "subscription" && (
                            <Badge
                              variant="outline"
                              className="text-[10px] h-4 px-1.5 gap-0.5"
                            >
                              <Timer className="h-2.5 w-2.5" />
                              {formatInterval(
                                profile.autoUpdateInterval,
                                t,
                              )}
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
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleUpdate(profile.id)}
                            disabled={isUpdating}
                            title={t("profiles.update")}
                          >
                            <RefreshCw
                              className={cn(
                                "h-3.5 w-3.5",
                                isUpdating && "animate-spin",
                              )}
                            />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openAutoUpdateDialog(profile)}
                            title={t("profiles.autoUpdateSettings")}
                          >
                            <Timer className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEditDialog(profile)}
                        title={t("profiles.editProfile")}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openYamlEditor(profile)}
                        title={t("profiles.editContent")}
                      >
                        <Code className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleExport(profile)}
                        title={t("profiles.export")}
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                      {!isActive && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleActivate(profile.id)}
                          disabled={loading}
                          title={t("profiles.use")}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive/70 hover:text-destructive"
                        onClick={() => setDeleteTarget(profile)}
                        disabled={loading}
                        title={t("common.delete")}
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

      {/* Delete Confirmation AlertDialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("profiles.deleteConfirm")}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.name && (
                <span className="font-medium text-foreground">
                  {deleteTarget.name}
                </span>
              )}
              {" — "}
              {t("profiles.deleteConfirmDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Profile Info Dialog */}
      <Dialog
        open={!!editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("profiles.editProfile")}</DialogTitle>
            <DialogDescription>
              {t("profiles.editProfileDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t("profiles.profileName")}</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder={t("profiles.profileName")}
              />
            </div>
            {editTarget?.source === "subscription" && (
              <div className="space-y-2">
                <Label>{t("profiles.subscriptionUrl")}</Label>
                <Input
                  value={editSubUrl}
                  onChange={(e) => setEditSubUrl(e.target.value)}
                  placeholder={t("profiles.subscriptionUrl")}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleEditSave} disabled={!editName.trim()}>
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* YAML Content Editor Dialog */}
      <Dialog
        open={!!yamlTarget}
        onOpenChange={(open) => {
          if (!open) {
            setYamlTarget(null);
            setYamlError(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {t("profiles.editContent")}
              {yamlTarget && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  — {yamlTarget.name}
                </span>
              )}
            </DialogTitle>
            <DialogDescription>
              {t("profiles.editContentDesc")}
            </DialogDescription>
          </DialogHeader>
          {yamlError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
              {yamlError}
            </div>
          )}
          <Textarea
            value={yamlContent}
            onChange={(e) => setYamlContent(e.target.value)}
            disabled={yamlLoading}
            className="flex-1 min-h-[400px] font-mono text-xs leading-relaxed resize-none"
            spellCheck={false}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setYamlTarget(null);
                setYamlError(null);
              }}
            >
              {t("common.cancel")}
            </Button>
            <Button onClick={handleYamlSave} disabled={yamlLoading}>
              {yamlLoading ? t("common.loading") : t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Auto-Update Settings Dialog */}
      <Dialog
        open={!!autoUpdateTarget}
        onOpenChange={(open) => !open && setAutoUpdateTarget(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("profiles.autoUpdateSettings")}</DialogTitle>
            <DialogDescription>
              {t("profiles.autoUpdateSettingsDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="auto-update-switch">
                {t("profiles.enableAutoUpdate")}
              </Label>
              <Switch
                id="auto-update-switch"
                checked={autoUpdateEnabled}
                onCheckedChange={setAutoUpdateEnabled}
              />
            </div>
            {autoUpdateEnabled && (
              <div className="space-y-2">
                <Label>{t("profiles.updateInterval")}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={10}
                    value={autoUpdateInterval}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val)) setAutoUpdateInterval(val);
                    }}
                    className="w-24 h-9"
                  />
                  <span className="text-sm text-muted-foreground">
                    {t("profiles.minutes")}
                  </span>
                  <div className="flex gap-1 ml-auto">
                    {[60, 240, 480, 1440].map((m) => (
                      <Button
                        key={m}
                        variant={
                          autoUpdateInterval === m ? "default" : "outline"
                        }
                        size="sm"
                        className="h-7 text-xs px-2"
                        onClick={() => setAutoUpdateInterval(m)}
                      >
                        {formatInterval(m, t)}
                      </Button>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("profiles.minIntervalHint")}
                </p>
              </div>
            )}
            {autoUpdateTarget && (
              <div className="text-xs text-muted-foreground">
                {t("profiles.lastUpdated")}:{" "}
                {relativeTime(autoUpdateTarget.updatedAt)}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAutoUpdateTarget(null)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleAutoUpdateSave}
              disabled={autoUpdateEnabled && autoUpdateInterval < 10}
            >
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
