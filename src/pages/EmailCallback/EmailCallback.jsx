import "./EmailCallback.css";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import useLanguage from "../../i18n/useLanguage";
import supabase from "../../services/supabaseClient";

function EmailCallback() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    const handleCallback = async () => {
      const urlParams = new URLSearchParams(window.location.hash.replace("#", "?"));
      const accessToken = urlParams.get("access_token");
      const refreshToken = urlParams.get("refresh_token");

      if (accessToken && refreshToken) {
        const { data: { session }, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (sessionError) {
          setError(sessionError.message);
          setStatus("error");
          return;
        }

        if (session) {
          setStatus("success");
          setTimeout(() => {
            navigate("/", { replace: true });
          }, 1500);
        }

        return;
      }

      setStatus("error");
      setError("No valid session token found in the URL.");
    };

    handleCallback();
  }, [navigate, t]);

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Payanam</h1>
          {status === "loading" && <p>{t("loading")}</p>}
          {status === "success" && <p>{t("emailVerified") || "Email Verified!"}</p>}
          {status === "error" && <p>{error}</p>}
        </div>
      </div>
    </div>
  );
}

export default EmailCallback;
