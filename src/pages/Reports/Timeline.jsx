import React from "react";
import InsightsNav from "../../components/Insights/InsightsNav";
import useLanguage from "../../i18n/useLanguage";

export default function Timeline() {
  const { t } = useLanguage();
  return (
    <div style={{ padding: 20 }}>
        <InsightsNav />
      <h2>🕒 {t("timeline")}</h2>
      <p>{t("comingSoon")}</p>
    </div>
  );
}
