import "./Header.css";

function Header({
    title,
    subtitle,
    description
}) {

    return (

        <div className="page-header">

            <p>{subtitle}</p>

            <h1>{title}</h1>

            {description &&
                <span>{description}</span>
            }

        </div>

    );

}

export default Header;