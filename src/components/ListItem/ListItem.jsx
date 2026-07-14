import "./ListItem.css";

import { ChevronRight } from "lucide-react";

function ListItem({
    icon,
    title,
    onClick
}) {

    return (

        <div
            className="list-item"
            onClick={onClick}
        >

            <div className="left">

                <div className="icon-box">

                    {icon}

                </div>

                <span>{title}</span>

            </div>

            <ChevronRight size={18}/>

        </div>

    );

}

export default ListItem;