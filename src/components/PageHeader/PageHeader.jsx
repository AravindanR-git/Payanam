import "./PageHeader.css";

function PageHeader({
  title,
  subtitle,
  right,
}) {
  return (
    <div className="page-header">
      <div>
        <h1 className="page-title">{title}</h1>

        {subtitle && (
          <p className="page-subtitle">
            {subtitle}
          </p>
        )}
      </div>

      {right}
    </div>
  );
}

export default PageHeader;