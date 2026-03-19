import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Moon, Sun, Monitor, Globe, Shield, Info } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useSettingsStore, useProxyStore } from "@/store";

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

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{t("settings.title")}</h1>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sun className="h-5 w-5" />
            {t("settings.appearance")}
          </CardTitle>
          <CardDescription>{t("settings.appearanceDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{t("settings.theme")}</p>
              <p className="text-sm text-muted-foreground">
                {t("settings.themeDesc")}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant={settings.theme === "light" ? "default" : "outline"}
                size="sm"
                onClick={() => handleTheme("light")}
              >
                <Sun className="h-4 w-4 mr-1" />
                {t("settings.light")}
              </Button>
              <Button
                variant={settings.theme === "dark" ? "default" : "outline"}
                size="sm"
                onClick={() => handleTheme("dark")}
              >
                <Moon className="h-4 w-4 mr-1" />
                {t("settings.dark")}
              </Button>
              <Button
                variant={settings.theme === "system" ? "default" : "outline"}
                size="sm"
                onClick={() => handleTheme("system")}
              >
                <Monitor className="h-4 w-4 mr-1" />
                {t("settings.system")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* General */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            {t("settings.general")}
          </CardTitle>
          <CardDescription>{t("settings.generalDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{t("settings.language")}</p>
              <p className="text-sm text-muted-foreground">
                {t("settings.languageDesc")}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant={settings.language === "en" ? "default" : "outline"}
                size="sm"
                onClick={() => handleLanguage("en")}
              >
                {t("settings.english")}
              </Button>
              <Button
                variant={settings.language === "zh" ? "default" : "outline"}
                size="sm"
                onClick={() => handleLanguage("zh")}
              >
                {t("settings.chinese")}
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">
                {t("settings.minimizeToTray")}
              </p>
              <p className="text-sm text-muted-foreground">
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

      {/* Proxy Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {t("settings.proxySettings")}
          </CardTitle>
          <CardDescription>{t("settings.proxySettingsDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">
                {t("settings.systemProxy")}
              </p>
              <p className="text-sm text-muted-foreground">
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

      {/* About */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            {t("settings.about")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">{t("settings.version")}</span>
            <Badge variant="outline">v0.1.0</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">{t("settings.basedOn")}</span>
            <Badge variant="outline">mihomo (Clash Meta)</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
