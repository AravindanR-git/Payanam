import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./Signup.css";
import useLanguage from "../../i18n/useLanguage";
import { useAuth } from "../../contexts/useAuth";
import supabase from "../../services/supabaseClient";

function Signup() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { signUp, verifyOTP, resendVerificationEmail } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const getInitialStep = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get("verify") === "true" ? "verify" : "form";
  };

  const [step, setStep] = useState(getInitialStep);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError(t("passwordMismatch"));
      return;
    }

    if (password.length < 6) {
      setError(t("passwordTooShort"));
      return;
    }

    setLoading(true);

    try {
      const { error: signUpError } = await signUp({
        email,
        password,
        fullName: name,
        phone: phone || null,
      });

      if (signUpError) {
        throw new Error(signUpError);
      }

      setVerificationEmail(email);
      setStep("verify");
      setCountdown(30);
    } catch (err) {
      setError(err.message || t("registrationFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error: verifyError } = await verifyOTP({
        email: verificationEmail,
        token: verificationCode,
      });

      if (verifyError) {
        throw new Error(verifyError);
      }

      const { data: { user } } = await supabase.auth.getUser();

      if (user?.email_confirmed_at) {
        navigate("/", { replace: true });
      } else {
        setError("Email verification incomplete. Please try again.");
      }
    } catch (err) {
      setError(err.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendLoading(true);
    try {
      const { error: resendError } = await resendVerificationEmail(verificationEmail);
      if (resendError) {
        throw new Error(resendError);
      }
      setCountdown(30);
    } catch (err) {
      setError(err.message || "Failed to resend code");
    } finally {
      setResendLoading(false);
    }
  };

  const handleBackToForm = () => {
    setStep("form");
    setError("");
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Payanam</h1>
          <p>
            {step === "form"
              ? t("createYourAccount")
              : t("verifyEmail") || "Verify Your Email"}
          </p>
        </div>

        <form
          onSubmit={step === "form" ? handleSubmit : handleVerify}
          className="auth-form"
        >
          {error && (
            <div className="auth-error">{error}</div>
          )}

          {step === "form" && (
            <>
              <div className="input-group">
                <label htmlFor="name">{t("fullName")}</label>
                <input
                  id="name"
                  type="text"
                  placeholder={t("yourName")}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                />
              </div>

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

              <div className="input-group">
                <label htmlFor="phone">{t("phone")}</label>
                <input
                  id="phone"
                  type="tel"
                  placeholder={t("enterPhone") || "Enter phone number (optional)"}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoComplete="tel"
                />
              </div>

              <div className="input-group">
                <label htmlFor="password">{t("password")}</label>
                <input
                  id="password"
                  type="password"
                  placeholder={t("createPassword")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
                {loading ? t("creatingAccount") : t("signup")}
              </button>
            </>
          )}

          {step === "verify" && (
            <>
              <div className="input-group">
                <label htmlFor="verification-code">{t("verificationCode") || "Verification Code"}</label>
                <input
                  id="verification-code"
                  type="text"
                  placeholder="123456"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
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
                {loading ? (t("loading") || "Verifying...") : (t("submit") || "Submit")}
              </button>

              <button
                type="button"
                className="auth-resend"
                onClick={handleResend}
                disabled={resendLoading || countdown > 0}
              >
                {resendLoading
                  ? (t("loading") || "Sending...")
                  : countdown > 0
                  ? `${t("resendCode") || "Resend"} (${countdown}s)`
                  : (t("resendCode") || "Resend Code")}
              </button>
            </>
          )}
        </form>

        <div className="auth-extras">
          {step === "verify" && (
            <button
              type="button"
              className="auth-link-button"
              onClick={handleBackToForm}
            >
              {t("backToSignup") || "Back to Sign Up"}
            </button>
          )}
        </div>

        <p className="auth-footer">
          {step === "form" && (
            <>
              {t("alreadyHaveAccount")}{" "}
              <Link to="/login" className="auth-link">
                {t("login")}
              </Link>
            </>
          )}
          {step === "verify" && (
            <>
              <span style={{ color: "#6E6E73" }}>
                {t("enterVerificationCode") || "Enter the code sent to"}{" "}
                <span style={{ fontWeight: 600 }}>{verificationEmail}</span>
              </span>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

export default Signup;
