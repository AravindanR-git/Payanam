import "./ForgotPassword.css";

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Shield } from "lucide-react";

import { useAuth } from "../../contexts/useAuth";
import useLanguage from "../../i18n/useLanguage";

function ForgotPassword() {
  const { t } = useLanguage();
  const { resetPassword, verifyResetOTP, updatePassword } = useAuth();

  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error: resetError } = await resetPassword(email);

      if (resetError) {
        throw new Error(resetError);
      }

      setStep("otp");
      setCountdown(30);
    } catch (err) {
      setError(err.message || t("somethingWentWrong"));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error: verifyError } = await verifyResetOTP({
        email,
        token: otp,
      });

      if (verifyError) {
        throw new Error(verifyError);
      }

      setStep("password");
    } catch (err) {
      setError(err.message || t("invalidCredentials"));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
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
    } catch (err) {
      setError(err.message || t("somethingWentWrong"));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;

    setError("");
    setLoading(true);

    try {
      const { error: resendError } = await resetPassword(email);

      if (resendError) {
        throw new Error(resendError);
      }

      setCountdown(30);
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
            <p>
              {step === "email" && (t("enterPasswordReset") || "Enter your email to reset your password.")}
              {step === "otp" && (t("enterVerificationCode") || "Enter the 6-digit code sent to your email.")}
              {step === "password" && (t("createPassword") || "Create a new password.")}
              {step === "success" && (t("resetPasswordSuccess") || "Password reset successfully!")}
            </p>
          </div>
        </div>

        {error && (
          <div className="auth-error">{error}</div>
        )}

        {step === "email" && (
          <form onSubmit={handleSendOtp} className="auth-form">
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
              {loading ? t("loading") : (t("resetPassword") || "Send OTP")}
            </button>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={handleVerifyOtp} className="auth-form">
            <div className="input-group">
              <label htmlFor="otp">{t("verificationCode") || "Verification Code"}</label>
              <input
                id="otp"
                type="text"
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                maxLength={6}
                autoComplete="one-time-code"
              />
            </div>

            <button
              type="submit"
              className="auth-submit"
              disabled={loading}
            >
              {loading ? t("loading") : (t("verifyAndContinue") || "Verify OTP")}
            </button>

            <div style={{ textAlign: "center", marginTop: "12px" }}>
              <button
                type="button"
                onClick={handleResend}
                disabled={countdown > 0 || loading}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--color-primary, #007AFF)",
                  cursor: countdown > 0 ? "not-allowed" : "pointer",
                  fontSize: "14px",
                  opacity: countdown > 0 ? 0.5 : 1,
                }}
              >
                {countdown > 0
                  ? `${t("resendCode") || "Resend Code"} (${countdown}s)`
                  : (t("resendCode") || "Resend Code")}
              </button>
            </div>
          </form>
        )}

        {step === "password" && (
          <form onSubmit={handleResetPassword} className="auth-form">
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
                placeholder={t("confirmPassword")}
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

        {success && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <p style={{ marginBottom: "20px", color: "#059669" }}>
              {t("resetPasswordSuccess") || "Password reset successfully!"}
            </p>
            <Link to="/login" className="auth-link">
              {t("backToLogin")}
            </Link>
          </div>
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
