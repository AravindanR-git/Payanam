import "./ItemStep.css";

function ItemStep({
  category,
  items,
  onBack,
  onSelect,
}) {

  return (

    <div>

      <button
  type="button"
  className="back-step-btn"
  onClick={(e) => {
    e.preventDefault();
    e.stopPropagation();
    onBack();
  }}
>
  ← Back
</button>

      <h3>{category?.name}</h3>

      <div className="item-grid">

        {items.length === 0 ? (

          <p>No items found.</p>

        ) : (

          items.map((item) => (

            <div

              key={item.id}

              className="item-tile"

              style={{
                backgroundImage:
                  `url(/assets/items/${item.image || "placeholder.jpg"})`
              }}

              onClick={() => onSelect(item)}

            >

              <div className="item-overlay">

                <h2>{item.name}</h2>

              </div>

            </div>

          ))

        )}

      </div>

    </div>

  );

}

export default ItemStep;