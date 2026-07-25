import "./Card.css";

function Card({
  children,
  className = "",
  padding = "normal",
  onClick,
}) {
  return (
    <div
      className={`app-card app-card-${padding} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export default Card;