import "./Input.css";

function Input({
  label,
  value,
  onChange,
  placeholder = "",
  type = "text",
  required = false,
}) {
  return (
    <div className="input-group">

      {label && (
        <label className="input-label">
          {label}
          {required && (
            <span className="required">*</span>
          )}
        </label>
      )}

      <input
        className="app-input"
        value={value}
        type={type}
        placeholder={placeholder}
        onChange={onChange}
      />

    </div>
  );
}

export default Input;