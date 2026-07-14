import "./Stepper.css";
import { Minus, Plus } from "lucide-react";

function Stepper({
  label,
  value,
  setValue,
  min = 0,
  max = 100,
}) {
  const decrease = () => {
    if (value > min) {
      setValue(value - 1);
    }
  };

  const increase = () => {
    if (value < max) {
      setValue(value + 1);
    }
  };

  return (
    <div className="stepper">

      <span className="stepper-label">
        {label}
      </span>

      <div className="stepper-box">

        <button onClick={decrease}>
          <Minus size={18}/>
        </button>

        <span>{value}</span>

        <button onClick={increase}>
          <Plus size={18}/>
        </button>

      </div>

    </div>
  );
}

export default Stepper;