import "./ForgotPassword.css";

import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Shield } from "lucide-react";

import { useAuth } from "../../contexts/useAuth";
import useLanguage from "../../i18n/useLanguage";

function ForgotPassword() {
  const { t } = useLanguage();
  const { resetPassword } = useAuth();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setLoading(true);

    try {
      const { error: resetError } = await resetPassword(email);

      if (resetError) {
        throw new Error(resetError);
      }

      setSuccess(true);
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
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginBottom: "24px" }}>
            <Link to="/login" style={{ position: "absolute", left: 0 }}>
              <ArrowLeft size={20} />
            </Link>
            <h1>Payanam</h1>
          </div>
          <div style={{ textAlign: "center", marginBottom: "16px" }}>
            <Shield size={48} style={{ color: "#007AFF", marginBottom: "8px" }} />
            <p>{t("enterPasswordReset") || "Enter your email to reset your password."}</p>
          </div>
        </div>

        {error && (
          <div className="auth-error">{error}</div>
        )}

        {success ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <p style={{ marginBottom: "20px", color: "#059669" }}>
              {t("resetEmailSent") || "If that email is registered, a reset link has been sent."}
            </p>
            <Link to="/login" className="auth-link">
              {t("backToLogin")}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="input-group">
              <label htmlFor="email">{t("email")}</label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <button
              type="submit"
              className="auth-submit"
              disabled={loading}
            >
              {loading ? t("loading") : (t("resetPassword") || "Reset Password")}
            </button>
          </form>
        )}

        <p className="auth-footer">
          <Link to="/login" className="auth-link">
            {t("backToLogin")}
          </Link>
        </p>
      </div>
    </div>
  );
}

export default ForgotPassword;
