import { useState } from "react";
import Button from "../Button/Button";

function ManualLocationSheet({
  onSave,
  onCancel,
}) {
  const [locationName, setLocationName] =
    useState("");

  const save = () => {
    const value = locationName.trim();

    if (!value) {
      alert("Enter a location.");
      return;
    }

    onSave({
      latitude: null,
      longitude: null,
      locationName: value,
      source: "manual",
    });
  };

  return (
    <div className="bottom-sheet-content">
      <h3>Manual Location</h3>

      <input
        className="sheet-input"
        placeholder="Eg. Tirupati Bus Stand"
        value={locationName}
        onChange={(e) =>
          setLocationName(e.target.value)
        }
      />

      <div
        style={{
          display: "flex",
          gap: 12,
          marginTop: 20,
        }}
      >
        <Button
          variant="secondary"
          onClick={onCancel}
        >
          Cancel
        </Button>

        <Button onClick={save}>
          Save
        </Button>
      </div>
    </div>
  );
}

export default ManualLocationSheet;