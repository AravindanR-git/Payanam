import "./ResetPassword.css";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../contexts/useAuth";
import useLanguage from "../../i18n/useLanguage";

function ResetPassword() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { session, updatePassword } = useAuth();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!session) {
      navigate("/login", { replace: true });
    }
  }, [session, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError(t("passwordMismatch"));
      return;
    }

    if (newPassword.length < 6) {
      setError(t("passwordTooShort"));
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await updatePassword(newPassword);

      if (updateError) {
        throw new Error(updateError);
      }

      setSuccess(true);

      setTimeout(() => {
        navigate("/", { replace: true });
      }, 2000);
    } catch (err) {
      setError(err.message || t("somethingWentWrong"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Payanam</h1>
          <p>{t("enterNewPassword") || "Enter your new password"}</p>
        </div>

        {error && (
          <div className="auth-error">{error}</div>
        )}

        {success ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <p style={{ marginBottom: "20px", color: "#059669" }}>
              {t("passwordUpdated") || "Password updated successfully!"}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="input-group">
              <label htmlFor="newPassword">{t("createPassword")}</label>
              <input
                id="newPassword"
                type="password"
                placeholder={t("createPassword")}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>

            <div className="input-group">
              <label htmlFor="confirmPassword">{t("confirmPassword")}</label>
              <input
                id="confirmPassword"
                type="password"
                placeholder={t("createPassword")}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              className="auth-submit"
              disabled={loading}
            >
              {loading ? (t("loading") || "Updating...") : (t("updatePassword") || "Update Password")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default ResetPassword;
