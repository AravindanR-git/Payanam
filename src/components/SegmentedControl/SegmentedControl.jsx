import "./SegmentedControl.css";

function SegmentedControl({
  options,
  value,
  onChange,
}) {
  return (
    <div className="segment">

      {options.map((item) => (

        <button
          key={item}
          type="button"
          className={
            value === item
              ? "segment-item active"
              : "segment-item"
          }
          onClick={() => onChange(item)}
        >
          {item}
        </button>

      ))}

    </div>
  );
}

export default SegmentedControl;