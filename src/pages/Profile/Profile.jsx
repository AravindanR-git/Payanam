import "./Profile.css";

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Camera, Trash2, Save, Lock } from "lucide-react";

import useLanguage from "../../i18n/useLanguage";
import { useAuth } from "../../contexts/useAuth";

function Profile() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user, profile, updateProfile, uploadAvatar, signOut } = useAuth();

  const [name, setName] = useState(profile?.display_name || user?.user_metadata?.display_name || "");
  const [phone, setPhone] = useState(profile?.phone || user?.user_metadata?.phone || "");
  const [saving, setSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setSuccess("");

    const { error: uploadError, url } = await uploadAvatar(file);

    if (uploadError) {
      setError(uploadError);
    } else {
      setAvatarUrl(url);
      setSuccess(t("profileUpdated") || "Profile updated successfully");
    }
  };

  const handleRemoveAvatar = async () => {
    if (!window.confirm(t("removePhoto") || "Remove profile photo?")) return;

    const { error: updateError } = await updateProfile({ avatar_url: null });

    if (updateError) {
      setError(updateError);
    } else {
      setAvatarUrl(null);
      setSuccess(t("profileUpdated") || "Profile updated successfully");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const { error: updateError } = await updateProfile({
        display_name: name,
        phone: phone || null,
      });

      if (updateError) {
        throw new Error(updateError);
      }

      setSuccess(t("profileUpdated") || "Profile updated successfully");
    } catch (err) {
      setError(err.message || t("somethingWentWrong"));
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  const displayName = profile?.display_name || user?.email || "User";
  const email = user?.email || "";

  return (
    <div className="profile-page">
      <header className="profile-nav">
        <button className="profile-back" aria-label="Go back" onClick={() => navigate(-1)}>
          <ArrowLeft size={22} />
        </button>
        <h1>{t("profile")}</h1>
        <span aria-hidden="true" />
      </header>

      <section className="profile-hero">
        <div className="avatar-container">
          {avatarUrl ? (
            <img src={avatarUrl} alt="Profile" className="avatar-image" />
          ) : (
            <div className="avatar-placeholder">
              {displayName?.charAt(0)?.toUpperCase() || "U"}
            </div>
          )}
          <label className="avatar-upload-btn" aria-label="Upload photo">
            <Camera size={18} />
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              style={{ display: "none" }}
            />
          </label>
          {avatarUrl && (
            <button
              type="button"
              className="avatar-remove-btn"
              aria-label="Remove photo"
              onClick={handleRemoveAvatar}
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
        {error && <div className="profile-error">{error}</div>}
        {success && <div className="profile-success">{success}</div>}
      </section>

      <form onSubmit={handleSubmit} className="profile-form">
        <div className="input-group">
          <label htmlFor="name">{t("fullName")}</label>
          <input
            id="name"
            type="text"
            placeholder={t("yourName")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
        </div>

        <div className="input-group">
          <label htmlFor="email">{t("email")}</label>
          <input
            id="email"
            type="email"
            value={email}
            disabled
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

        <button
          type="submit"
          className="profile-submit"
          disabled={saving}
        >
          <Save size={18} />
          {saving ? (t("loading") || "Saving...") : (t("save") || "Save Changes")}
        </button>
      </form>

      <section className="profile-actions">
        <Link to="/forgot-password" className="profile-action-row">
          <span className="profile-action-icon"><Lock size={19} /></span>
          <span>{t("changePassword") || "Change Password"}</span>
        </Link>
      </section>

      <section className="profile-account">
        <button
          className="profile-logout-btn"
          onClick={handleLogout}
        >
          <span className="profile-logout-icon"><Lock size={19} /></span>
          {t("logout")}
        </button>
      </section>
    </div>
  );
}

export default Profile;
