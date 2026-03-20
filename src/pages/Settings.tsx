import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Moon, Sun, Monitor, Globe, Shield, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useSettingsStore, useProxyStore } from "@/store";
import { cn } from "@/lib/utils";

export default function Settings() {
  const { t, i18n } = useTranslation();
  const { settings, fetchSettings, updateSettings } = useSettingsStore();
  const { status, setSystemProxy } = useProxyStore();

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  if (!settings) return null;

  const applyTheme = (theme: string) => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else if (theme === "light") {
      document.documentElement.classList.remove("dark");
    } else {
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  };

  const handleTheme = (theme: string) => {
    applyTheme(theme);
    updateSettings({ theme });
  };

  const handleLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    updateSettings({ language: lang });
  };

  const handleSystemProxy = async (enable: boolean) => {
    if (status?.running) {
      await setSystemProxy(enable);
    }
    updateSettings({ systemProxy: enable });
  };

  const themeOptions = [
    { key: "light", icon: Sun, label: t("settings.light") },
    { key: "dark", icon: Moon, label: t("settings.dark") },
    { key: "system", icon: Monitor, label: t("settings.system") },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("settings.title")}</h1>

      {/* Appearance */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <Sun className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">{t("settings.appearance")}</h2>
        </div>
        <Card>
          <CardContent className="p-4 space-y-4">
            {/* Theme */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{t("settings.theme")}</p>
                <p className="text-xs text-muted-foreground">
                  {t("settings.themeDesc")}
                </p>
              </div>
              <div className="flex gap-1 bg-muted rounded-lg p-0.5">
                {themeOptions.map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => handleTheme(opt.key)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                      settings.theme === opt.key
                        ? "bg-background shadow-sm text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <opt.icon className="h-3.5 w-3.5" />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* General */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <Globe className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">{t("settings.general")}</h2>
        </div>
        <Card>
          <CardContent className="p-4 space-y-4">
            {/* Language */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{t("settings.language")}</p>
                <p className="text-xs text-muted-foreground">
                  {t("settings.languageDesc")}
                </p>
              </div>
              <div className="flex gap-1 bg-muted rounded-lg p-0.5">
                <button
                  onClick={() => handleLanguage("en")}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                    settings.language === "en"
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  English
                </button>
                <button
                  onClick={() => handleLanguage("zh")}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                    settings.language === "zh"
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  中文
                </button>
              </div>
            </div>

            <div className="border-t" />

            {/* Minimize to tray */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">
                  {t("settings.minimizeToTray")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("settings.minimizeToTrayDesc")}
                </p>
              </div>
              <Switch
                checked={settings.minimizeToTray}
                onCheckedChange={(v) => updateSettings({ minimizeToTray: v })}
              />
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Proxy Settings */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <Shield className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">
            {t("settings.proxySettings")}
          </h2>
        </div>
        <Card>
          <CardContent className="p-4 space-y-4">
            {/* System Proxy */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">
                  {t("settings.systemProxy")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("settings.systemProxyDesc")}
                </p>
              </div>
              <Switch
                checked={settings.systemProxy}
                onCheckedChange={handleSystemProxy}
                disabled={!status?.running}
              />
            </div>
          </CardContent>
        </Card>
      </section>

      {/* About */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <Info className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">{t("settings.about")}</h2>
        </div>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-sm font-semibold">Clash Kite</p>
                <p className="text-xs text-muted-foreground">
                  {t("settings.basedOn")} mihomo (Clash Meta)
                </p>
              </div>
              <Badge variant="outline" className="font-mono">
                v0.1.0
              </Badge>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
