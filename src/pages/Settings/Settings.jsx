import "./Settings.css";

import { useNavigate } from "react-router-dom";

import {
  ArrowLeft,
  FolderOpen,
  UtensilsCrossed,
  MapPin,
  Map,
  Languages,
  Palette,
  Info,
} from "lucide-react";

import SettingCard from "../../components/SettingCard/SettingCard";

function Settings() {

  const navigate = useNavigate();

  return (

    <div className="settings-page">

      <button
        className="back-btn"
        onClick={() => navigate(-1)}
      >
        <ArrowLeft size={20}/>
      </button>

      <div className="settings-hero">

        <div className="settings-logo">

          ⚙️

        </div>

        <h1>Settings</h1>

        <p>

          Configure Payanam the way
          you like.

        </p>

      </div>

      <h3 className="section-title">

        Expense Setup

      </h3>

      <div className="settings-grid">

        <SettingCard

          icon={<FolderOpen size={22}/>}

          title="Categories"

          onClick={()=>
            navigate("/categories")
          }

        />

        <SettingCard

          icon={<UtensilsCrossed size={22}/>}

          title="Expense Items"

          onClick={()=>
            navigate("/items")
          }

        />

        <SettingCard

          icon={<MapPin size={22}/>}

          title="Places"

          onClick={()=>
            navigate("/places")
          }

        />

      </div>

      <h3 className="section-title">

        Application

      </h3>

      <div className="settings-grid">

        <SettingCard

          icon={<Map size={22}/>}

          title="Auto Location"

          right="OFF"

        />

        <SettingCard

          icon={<Languages size={22}/>}

          title="Language"

          right="English"

        />

        <SettingCard

          icon={<Palette size={22}/>}

          title="Appearance"

          right="System"

        />

        <SettingCard

          icon={<Info size={22}/>}

          title="About"

        />

      </div>

    </div>

  );

}

export default Settings;