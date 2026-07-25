import "./Button.css";

function Button({
  children,
  onClick,
  type = "button",
  variant = "primary",
  size = "md",
  disabled = false,
  fullWidth = false,
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        app-button
        app-button-${variant}
        app-button-${size}
        ${fullWidth ? "app-button-full" : ""}
      `}
    >
      {children}
    </button>
  );
}

export default Button;