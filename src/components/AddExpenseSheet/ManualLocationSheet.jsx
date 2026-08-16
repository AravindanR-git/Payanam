import { useEffect, useState } from "react";
import Button from "../Button/Button";
import LocationService from "../../services/LocationService";
import "./ManualLocationSheet.css";
import useLanguage from "../../i18n/useLanguage";

function ManualLocationSheet({
  initialLocationName = "",
  coordinates = null,
  onSave,
  onCancel,
}) {
  const { t } = useLanguage();
  const [locationName, setLocationName] =
    useState(initialLocationName);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedCoordinates, setSelectedCoordinates] =
    useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  useEffect(() => {
    const query = locationName.trim();

    if (
      selectedCoordinates ||
      query.length < 3 ||
      !navigator.onLine
    ) {
      setSearchResults([]);
      setSearchError("");
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
          setSearchError(t("noMatchingLocationsFound"));
        }
      } catch {
        if (!isCurrent) return;

        setSearchResults([]);
        setSearchError(
          t("locationSuggestionsUnavailable")
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
  }, [locationName, selectedCoordinates]);

  const selectLocation = (result) => {
    setLocationName(result.locationName);
    setSelectedCoordinates({
      latitude: result.latitude,
      longitude: result.longitude,
    });
    setSearchResults([]);
    setSearchError("");
  };

  const save = () => {
    const value = locationName.trim();

    if (!value) {
      alert(t("enterLocation"));
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
      <h3>{t("manualLocation")}</h3>

      <div className="manual-location-search">
        <input
          className="sheet-input"
          placeholder={t("locationPlaceholder")}
          value={locationName}
          onChange={(e) => {
            setLocationName(e.target.value);
            setSelectedCoordinates(null);
            setSearchResults([]);
            setSearchError("");
          }}
        />
      </div>

      <p className="manual-location-helper">
        {isSearching
          ? t("findingMatchingLocations")
          : t("suggestionsAppearWhenOnline")}
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
          {t("cancel")}
        </Button>

        <Button onClick={save}>
          {t("save")}
        </Button>
      </div>
    </div>
  );
}

export default ManualLocationSheet;
