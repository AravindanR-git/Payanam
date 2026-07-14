import "./EmptyState.css";

function EmptyState({
    title,
    subtitle
}){

    return(

        <div className="empty-state">

            <h2>{title}</h2>

            <p>{subtitle}</p>

        </div>

    )

}

export default EmptyState;