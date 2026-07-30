import "./Settings.css";

import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ChevronRight,
  FolderOpen,
  Languages,
  MapPin,
  Palette,
  Settings as SettingsIcon,
  UtensilsCrossed,
} from "lucide-react";

import ThemeContext from "../../theme/ThemeContext";
import useLanguage from "../../i18n/useLanguage";

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

  const setMode = (mode) => setSettings((current) => ({ ...current, mode }));

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
        <NavigationRow icon={<FolderOpen size={19} />} label={t("categories")} onClick={() => navigate("/categories")} />
        <NavigationRow icon={<UtensilsCrossed size={19} />} label={t("expenseItems")} onClick={() => navigate("/items")} />
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
    </div>
  );
}

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
