import { useState, useEffect } from "react";
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

export default function Settings() {
  const { t, i18n } = useTranslation();
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");
  const [language, setLanguage] = useState(i18n.language || "en");
  const [autoStart, setAutoStart] = useState(false);
  const [minimizeToTray, setMinimizeToTray] = useState(true);
  const [systemProxy, setSystemProxy] = useState(false);
  const [tunMode, setTunMode] = useState(false);

  useEffect(() => {
    // Load theme from localStorage
    const savedTheme = localStorage.getItem("theme") as
      | "light"
      | "dark"
      | "system"
      | null;
    if (savedTheme) {
      setTheme(savedTheme);
      applyTheme(savedTheme);
    }

    // Load language from localStorage
    const savedLanguage = localStorage.getItem("language");
    if (savedLanguage) {
      setLanguage(savedLanguage);
    }
  }, []);

  const applyTheme = (newTheme: "light" | "dark" | "system") => {
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else if (newTheme === "light") {
      document.documentElement.classList.remove("dark");
    } else {
      // System preference
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  };

  const handleThemeChange = (newTheme: "light" | "dark" | "system") => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    applyTheme(newTheme);
  };

  const handleLanguageChange = (newLanguage: "en" | "zh") => {
    setLanguage(newLanguage);
    i18n.changeLanguage(newLanguage);
    localStorage.setItem("language", newLanguage);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t("settings.title")}</h1>
      </div>

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
            <div className="space-y-0.5">
              <label className="text-sm font-medium">
                {t("settings.theme")}
              </label>
              <p className="text-sm text-muted-foreground">
                {t("settings.themeDesc")}
              </p>
            </div>
            <div className="flex space-x-2">
              <Button
                variant={theme === "light" ? "default" : "outline"}
                size="sm"
                onClick={() => handleThemeChange("light")}
              >
                <Sun className="h-4 w-4 mr-2" />
                {t("settings.light")}
              </Button>
              <Button
                variant={theme === "dark" ? "default" : "outline"}
                size="sm"
                onClick={() => handleThemeChange("dark")}
              >
                <Moon className="h-4 w-4 mr-2" />
                {t("settings.dark")}
              </Button>
              <Button
                variant={theme === "system" ? "default" : "outline"}
                size="sm"
                onClick={() => handleThemeChange("system")}
              >
                <Monitor className="h-4 w-4 mr-2" />
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
            <div className="space-y-0.5">
              <label className="text-sm font-medium">
                {t("settings.language")}
              </label>
              <p className="text-sm text-muted-foreground">
                {t("settings.languageDesc")}
              </p>
            </div>
            <div className="flex space-x-2">
              <Button
                variant={language === "en" ? "default" : "outline"}
                size="sm"
                onClick={() => handleLanguageChange("en")}
              >
                {t("settings.english")}
              </Button>
              <Button
                variant={language === "zh" ? "default" : "outline"}
                size="sm"
                onClick={() => handleLanguageChange("zh")}
              >
                {t("settings.chinese")}
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label className="text-sm font-medium">
                {t("settings.autoStart")}
              </label>
              <p className="text-sm text-muted-foreground">
                {t("settings.autoStartDesc")}
              </p>
            </div>
            <Switch checked={autoStart} onCheckedChange={setAutoStart} />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label className="text-sm font-medium">
                {t("settings.minimizeToTray")}
              </label>
              <p className="text-sm text-muted-foreground">
                {t("settings.minimizeToTrayDesc")}
              </p>
            </div>
            <Switch
              checked={minimizeToTray}
              onCheckedChange={setMinimizeToTray}
            />
          </div>
        </CardContent>
      </Card>

      {/* Proxy */}
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
            <div className="space-y-0.5">
              <label className="text-sm font-medium">
                {t("settings.systemProxy")}
              </label>
              <p className="text-sm text-muted-foreground">
                {t("settings.systemProxyDesc")}
              </p>
            </div>
            <Switch checked={systemProxy} onCheckedChange={setSystemProxy} />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label className="text-sm font-medium">
                {t("settings.tunMode")}
              </label>
              <p className="text-sm text-muted-foreground">
                {t("settings.tunModeDesc")}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline">{t("settings.beta")}</Badge>
              <Switch checked={tunMode} onCheckedChange={setTunMode} />
            </div>
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
          <CardDescription>{t("settings.aboutDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{t("settings.version")}</span>
            <Badge variant="outline">v0.1.0</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{t("settings.basedOn")}</span>
            <Badge variant="outline">Clash Meta</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{t("settings.license")}</span>
            <Badge variant="outline">MIT</Badge>
          </div>
          <div className="pt-4">
            <Button variant="outline" className="w-full">
              {t("settings.checkUpdates")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
