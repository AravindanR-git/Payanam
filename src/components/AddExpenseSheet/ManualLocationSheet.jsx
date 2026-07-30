import { useEffect, useState } from "react";
import Button from "../Button/Button";
import LocationService from "../../services/LocationService";
import "./ManualLocationSheet.css";

function ManualLocationSheet({
  initialLocationName = "",
  coordinates = null,
  onSave,
  onCancel,
}) {
  const [locationName, setLocationName] =
    useState(initialLocationName);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedCoordinates, setSelectedCoordinates] =
    useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [hasEditedLocation, setHasEditedLocation] =
    useState(false);

  useEffect(() => {
    const query = locationName.trim();

    if (
      !hasEditedLocation ||
      selectedCoordinates ||
      query.length < 3 ||
      !navigator.onLine
    ) {
      return;
    }

    let isCurrent = true;

    const timer = setTimeout(async () => {
      setIsSearching(true);
      setSearchError("");

      try {
        const results = await LocationService.searchLocations(query);

        if (!isCurrent) return;

        setSearchResults(results);

        if (results.length === 0) {
          setSearchError("No matching locations found.");
        }
      } catch {
        if (!isCurrent) return;

        setSearchResults([]);
        setSearchError(
          "Location suggestions are unavailable. You can still save manually."
        );
      } finally {
        if (isCurrent) {
          setIsSearching(false);
        }
      }
    }, 450);

    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [hasEditedLocation, locationName, selectedCoordinates]);

  const selectLocation = (result) => {
    setLocationName(result.locationName);
    setSelectedCoordinates({
      latitude: result.latitude,
      longitude: result.longitude,
    });
    setHasEditedLocation(false);
    setSearchResults([]);
    setSearchError("");
  };

  const save = () => {
    const value = locationName.trim();

    if (!value) {
      alert("Enter a location.");
      return;
    }

    onSave({
      latitude:
        selectedCoordinates?.latitude ??
        coordinates?.latitude ??
        null,
      longitude:
        selectedCoordinates?.longitude ??
        coordinates?.longitude ??
        null,
      locationName: value,
      source: "manual",
    });
  };

  return (
    <div className="bottom-sheet-content">
      <h3>Manual Location</h3>

      <div className="manual-location-search">
        <input
          className="sheet-input"
          placeholder="Eg. Tirupati Bus Stand"
          value={locationName}
          onChange={(e) => {
            setLocationName(e.target.value);
            setSelectedCoordinates(null);
            setSearchResults([]);
            setSearchError("");
            setHasEditedLocation(true);
          }}
        />
      </div>

      <p className="manual-location-helper">
        {isSearching
          ? "Finding matching locations..."
          : "Suggestions appear when online. You can still save manually while offline."}
      </p>

      {searchError && (
        <p className="manual-location-error">
          {searchError}
        </p>
      )}

      {searchResults.length > 0 && (
        <div className="manual-location-results">
          {searchResults.map((result) => (
            <button
              key={`${result.latitude}-${result.longitude}`}
              type="button"
              onClick={() => selectLocation(result)}
            >
              {result.locationName}
            </button>
          ))}
        </div>
      )}

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
