import "./IconAvatar.css";

function IconAvatar({
  icon,
  name = "",
  size = 40,
}) {
  if (icon) {
    return (
      <div
        className="icon-avatar"
        style={{
          width: size,
          height: size,
        }}
      >
        <img
          src={icon}
          alt={name}
          draggable={false}
        />
      </div>
    );
  }

  return (
    <div
      className="icon-avatar letter-avatar"
      style={{
        width: size,
        height: size,
      }}
    >
      {name ? name.charAt(0).toUpperCase() : "?"}
    </div>
  );
}

export default IconAvatar;