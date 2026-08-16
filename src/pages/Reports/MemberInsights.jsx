import React from "react";
import InsightsNav from "../../components/Insights/InsightsNav";
import useLanguage from "../../i18n/useLanguage";

export default function MemberInsights() {
  const { t } = useLanguage();
  return (
    <div style={{ padding: 20 }}>
        <InsightsNav />
      <h2>👥 {t("memberInsights")}</h2>
      <p>{t("comingSoon")}</p>
    </div>
  );
}
