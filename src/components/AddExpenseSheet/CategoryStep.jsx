import "./CategoryStep.css";

function CategoryStep({
  categories,
  onSelect,
  onBack,
}) {

  return (

    <div>
       <button
  className="back-step-btn"
  onClick={onBack}
>
  ← Back
</button>

      <h3>Select Category</h3>

      <div className="category-grid">

        {categories.map((category) => (

          <div

            key={category.id}

            className="category-tile"

            style={{
              backgroundImage: `url(/assets/categories/${category.image || "placeholder.jpg"})`
            }}

            onClick={() => onSelect(category)}

          >

            <div className="category-overlay">

              <h2>{category.name}</h2>

            </div>

          </div>

        ))}

      </div>

    </div>

  );

}

export default CategoryStep;