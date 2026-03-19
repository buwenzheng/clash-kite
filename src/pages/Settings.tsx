import { useState } from "react";
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
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");
  const [language, setLanguage] = useState<"zh-CN" | "en-US">("en-US");
  const [autoStart, setAutoStart] = useState(false);
  const [minimizeToTray, setMinimizeToTray] = useState(true);
  const [systemProxy, setSystemProxy] = useState(false);
  const [tunMode, setTunMode] = useState(false);

  const handleThemeChange = (newTheme: "light" | "dark" | "system") => {
    setTheme(newTheme);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Settings</h1>
      </div>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sun className="h-5 w-5" />
            Appearance
          </CardTitle>
          <CardDescription>
            Customize the look and feel of the application
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label className="text-sm font-medium">Theme</label>
              <p className="text-sm text-muted-foreground">
                Select your preferred theme
              </p>
            </div>
            <div className="flex space-x-2">
              <Button
                variant={theme === "light" ? "default" : "outline"}
                size="sm"
                onClick={() => handleThemeChange("light")}
              >
                <Sun className="h-4 w-4 mr-2" />
                Light
              </Button>
              <Button
                variant={theme === "dark" ? "default" : "outline"}
                size="sm"
                onClick={() => handleThemeChange("dark")}
              >
                <Moon className="h-4 w-4 mr-2" />
                Dark
              </Button>
              <Button
                variant={theme === "system" ? "default" : "outline"}
                size="sm"
                onClick={() => handleThemeChange("system")}
              >
                <Monitor className="h-4 w-4 mr-2" />
                System
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
            General
          </CardTitle>
          <CardDescription>General application settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label className="text-sm font-medium">Language</label>
              <p className="text-sm text-muted-foreground">
                Select your preferred language
              </p>
            </div>
            <div className="flex space-x-2">
              <Button
                variant={language === "en-US" ? "default" : "outline"}
                size="sm"
                onClick={() => setLanguage("en-US")}
              >
                English
              </Button>
              <Button
                variant={language === "zh-CN" ? "default" : "outline"}
                size="sm"
                onClick={() => setLanguage("zh-CN")}
              >
                中文
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label className="text-sm font-medium">Auto Start</label>
              <p className="text-sm text-muted-foreground">
                Launch Clash Kite when your computer starts
              </p>
            </div>
            <Switch checked={autoStart} onCheckedChange={setAutoStart} />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label className="text-sm font-medium">Minimize to Tray</label>
              <p className="text-sm text-muted-foreground">
                Keep running in the system tray when closed
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
            Proxy Settings
          </CardTitle>
          <CardDescription>
            Configure proxy and network settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label className="text-sm font-medium">System Proxy</label>
              <p className="text-sm text-muted-foreground">
                Automatically set system proxy settings
              </p>
            </div>
            <Switch checked={systemProxy} onCheckedChange={setSystemProxy} />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label className="text-sm font-medium">TUN Mode</label>
              <p className="text-sm text-muted-foreground">
                Enable virtual network adapter mode (requires admin)
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline">Beta</Badge>
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
            About
          </CardTitle>
          <CardDescription>Information about Clash Kite</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Version</span>
            <Badge variant="outline">v0.1.0</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Based on</span>
            <Badge variant="outline">Clash Meta</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">License</span>
            <Badge variant="outline">MIT</Badge>
          </div>
          <div className="pt-4">
            <Button variant="outline" className="w-full">
              Check for Updates
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
