import "./SettingCard.css";
import { ChevronRight } from "lucide-react";

function SettingCard({
  icon,
  title,
  right,
  onClick,
}) {
  return (
    <div
      className="setting-card"
      onClick={onClick}
    >
      <div className="setting-left">

        <div className="setting-icon">
          {icon}
        </div>

        <span className="setting-title">
          {title}
        </span>

      </div>

      <div className="setting-right">

        {right && (
          <span className="setting-value">
            {right}
          </span>
        )}

        <ChevronRight size={18} />

      </div>

    </div>
  );
}

export default SettingCard;