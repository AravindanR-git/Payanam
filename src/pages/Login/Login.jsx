import "./Login.css";

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

import useLanguage from "../../i18n/useLanguage";
import { useAuth } from "../../contexts/useAuth";
import supabase from "../../services/supabaseClient";
import PayanamLogo from "../../components/PayanamBrand/PayanamLogo";

function Login() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { signIn } = useAuth();

  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error: signInError } = await signIn({ emailOrPhone, password });

      if (signInError) {
        throw new Error(signInError);
      }

      const { data: { user } } = await supabase.auth.getUser();

      if (!user.email_confirmed_at) {
        navigate("/signup?verify=true", { replace: true });
        return;
      }

      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message || t("invalidCredentials"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <PayanamLogo className="auth-brand-logo" />
          <p>{t("signInToContinue")}</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && (
            <div className="auth-error">{error}</div>
          )}

          <div className="input-group">
            <label htmlFor="emailOrPhone">{t("emailOrPhone") || "Email or Phone Number"}</label>
            <input
              id="emailOrPhone"
              type="text"
              placeholder={t("enterEmail") || "you@example.com"}
              value={emailOrPhone}
              onChange={(e) => setEmailOrPhone(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="input-group">
            <label htmlFor="password">{t("password")}</label>
            <input
              id="password"
              type="password"
              placeholder={t("enterPassword")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="auth-submit"
            disabled={loading}
          >
            {loading ? t("signingIn") : t("login")}
          </button>
        </form>

        <div className="auth-extras">
          <Link to="/forgot-password" className="auth-link">
            {t("forgotPassword")}
          </Link>
        </div>

        <p className="auth-footer">
          {t("dontHaveAccount")}{" "}
          <Link to="/signup" className="auth-link">
            {t("signup")}
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
