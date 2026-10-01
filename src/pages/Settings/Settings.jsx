import "./Settings.css";

import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ChevronRight,
  FolderOpen,
  Languages,
  LogOut,
  Lock,
  MapPin,
  Palette,
  Settings as SettingsIcon,
  UtensilsCrossed,
  RefreshCw,
  Wifi,
  WifiOff,
} from "lucide-react";

import ThemeContext from "../../theme/ThemeContext";
import useLanguage from "../../i18n/useLanguage";
import { useAuth } from "../../contexts/useAuth";
import safeLogout from "../../services/safeLogout";
import SyncService from "../../services/syncService";

const ACCENTS = [
  { name: "Blue", color: "#007AFF" },
  { name: "Purple", color: "#AF52DE" },
  { name: "Teal", color: "#30B0C7" },
  { name: "Pink", color: "#FF2D55" },
  { name: "Orange", color: "#FF9500" },
];

function Settings() {
  const navigate = useNavigate();
  const { settings, setSettings, setAccent } = useContext(ThemeContext);
  const { language, setLanguage, t } = useLanguage();
  const { user, profile } = useAuth();

  const [syncStatus, setSyncStatus] = useState({ pending: 0, failed: 0, synced: 0 });
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const setMode = (mode) => setSettings((current) => ({ ...current, mode }));

  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);

    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);

    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
    };
  }, []);

  const loadSyncStatus = async () => {
    const status = await SyncService.getSyncStatus();
    setSyncStatus(status);
  };

  useEffect(() => {
    let canceled = false;

    const fetchSyncStatus = async () => {
      const status = await SyncService.getSyncStatus();
      if (!canceled) {
        setSyncStatus(status);
      }
    };

    fetchSyncStatus();

    return () => {
      canceled = true;
    };
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);

    try {
      await SyncService.syncNow();
      await loadSyncStatus();
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogout = async () => {
    const { error } = await safeLogout();
    if (error) {
      console.error("Logout error:", error);
    }
    navigate("/login", { replace: true });
  };

  return (
    <div className="settings-page">
      <header className="settings-nav">
        <button className="settings-back" aria-label="Go back" onClick={() => navigate(-1)}>
          <ArrowLeft size={22} />
        </button>
        <h1>{t("settings")}</h1>
        <span aria-hidden="true" />
      </header>

      <section className="settings-hero">
        <div className="settings-logo"><SettingsIcon size={34} /></div>
        <p>{t("settingsDescription")}</p>
      </section>

      <SettingsGroup title={t("expenseSetup")}>
        <NavigationRow icon={<FolderOpen size={19} />} label="Transport" onClick={() => navigate("/settings/transport")} />
        <NavigationRow icon={<FolderOpen size={19} />} label={t("categories")} onClick={() => navigate("/categories")} />
        <NavigationRow icon={<UtensilsCrossed size={19} />} label={t("expenseItems")} onClick={() => navigate("/categories")} />
        <NavigationRow icon={<MapPin size={19} />} label={t("places")} onClick={() => navigate("/places")} />
      </SettingsGroup>

      <SettingsGroup title={t("preferences")}>
        <div className="settings-row settings-control-row">
          <span className="settings-row-icon indigo"><Languages size={19} /></span>
          <span className="settings-row-label">{t("language")}</span>
          <div className="ios-segment" role="group" aria-label={t("language")}>
            <button className={language === "en" ? "selected" : ""} onClick={() => setLanguage("en")}>EN</button>
            <button className={language === "ta" ? "selected" : ""} onClick={() => setLanguage("ta")}>தமிழ்</button>
          </div>
        </div>
        <div className="settings-row settings-control-row">
          <span className="settings-row-icon purple"><Palette size={19} /></span>
          <span className="settings-row-label">{t("appearance")}</span>
          <div className="ios-segment" role="group" aria-label={t("appearance")}>
            <button className={settings.mode === "light" ? "selected" : ""} onClick={() => setMode("light")}>{t("light")}</button>
            <button className={settings.mode === "dark" ? "selected" : ""} onClick={() => setMode("dark")}>{t("dark")}</button>
          </div>
        </div>
      </SettingsGroup>

      <SettingsGroup title={t("colorPalette")}>
        <div className="palette-row">
          {ACCENTS.map((accent) => (
            <button
              key={accent.color}
              className={`palette-swatch ${settings.accent === accent.color ? "selected" : ""}`}
              style={{ "--swatch": accent.color }}
              aria-label={`${accent.name} palette`}
              aria-pressed={settings.accent === accent.color}
              onClick={() => setAccent(accent.color)}
            />
          ))}
        </div>
      </SettingsGroup>

      <SettingsGroup title={t("sync")}>
        <div className="settings-row settings-control-row">
          <span className="settings-row-icon green">
            {isOnline ? <Wifi size={19} /> : <WifiOff size={19} />}
          </span>
          <span className="settings-row-label">
            {isOnline ? t("online") : t("offline")}
          </span>
          <span className="settings-row-value">
            {syncStatus.pending > 0
              ? `${syncStatus.pending} ${t("pending")}`
              : t("upToDate")}
          </span>
        </div>

        {syncStatus.failed > 0 && (
          <div className="settings-row settings-control-row">
            <span className="settings-row-icon red">
              <WifiOff size={19} />
            </span>
            <span className="settings-row-label">{t("failed")}</span>
            <span className="settings-row-value">{syncStatus.failed}</span>
          </div>
        )}

        <button
          className="sync-button"
          onClick={handleManualSync}
          disabled={isSyncing || !isOnline}
        >
          <RefreshCw size={18} className={isSyncing ? "spinning" : ""} />
          {isSyncing ? t("syncing") : t("syncNow")}
        </button>
      </SettingsGroup>

      <SettingsGroup title={t("profile")}>
        <div className="settings-row" style={{ cursor: 'pointer' }} onClick={() => navigate("/profile")}>
          <span className="settings-row-icon blue">
            <SettingsIcon size={19} />
          </span>
          <div style={{ flex: 1 }}>
            <span className="settings-row-label">
              {profile?.display_name || user?.email || t("profile")}
            </span>
            <div style={{ fontSize: "12px", color: "#6E6E73" }}>
              {user?.email}
            </div>
          </div>
          <ChevronRight className="settings-chevron" size={19} />
        </div>
      </SettingsGroup>

      <SettingsGroup title="Account">
        <button
          className="settings-row settings-navigation-row"
          onClick={() => navigate("/reset-password")}
        >
          <span className="settings-row-icon blue">
            <Lock size={19} />
          </span>
          <span className="settings-row-label">{t("changePassword") || "Change Password"}</span>
          <ChevronRight className="settings-chevron" size={19} />
        </button>
        <button
          className="settings-row settings-navigation-row"
          style={{ color: "#dc2626" }}
          onClick={handleLogout}
        >
          <span className="settings-row-icon red">
            <LogOut size={19} />
          </span>
          <span className="settings-row-label">{t("logout")}</span>
        </button>
      </SettingsGroup>
    </div>
  );
}

/** @param {{ title: string, children: React.ReactNode }} props */
function SettingsGroup({ title, children }) {
  return (
    <section className="settings-section">
      <h2>{title}</h2>
      <div className="settings-group">{children}</div>
    </section>
  );
}

function NavigationRow({ icon, label, onClick }) {
  return (
    <button className="settings-row settings-navigation-row" onClick={onClick}>
      <span className="settings-row-icon blue">{icon}</span>
      <span className="settings-row-label">{label}</span>
      <ChevronRight className="settings-chevron" size={19} />
    </button>
  );
}

export default Settings;
