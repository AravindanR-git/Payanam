import { useEffect, useState } from "react";
import { LocateFixed, X } from "lucide-react";
import Button from "../Button/Button";
import LocationService from "../../services/LocationService";
import PlaceLocationMap from "./PlaceLocationMap";

export default function PlaceLocationSelector({ coordinates, locationName, onRetryLocation, onConfirm, onClose }) {
  const [selected, setSelected] = useState(coordinates);
  const [query, setQuery] = useState(locationName || "");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [gpsError, setGpsError] = useState("");
  useEffect(() => setSelected(coordinates), [coordinates?.latitude, coordinates?.longitude]);
  useEffect(() => {
    const value = query.trim();
    if (value.length < 3 || !navigator.onLine) { setResults([]); return undefined; }
    let active = true;
    const timer = setTimeout(async () => {
      setSearching(true); setError("");
      try { const matches = await LocationService.searchLocations(value); if (active) { setResults(matches); if (!matches.length) setError("No matching locations found."); } }
      catch { if (active) { setResults([]); setError("Location suggestions are unavailable. You can still move the map pin."); } }
      finally { if (active) setSearching(false); }
    }, 450);
    return () => { active = false; clearTimeout(timer); };
  }, [query]);
  const choose = (point, name) => { setSelected(point); if (name !== undefined) setQuery(name); setResults([]); setError(""); };
  const retry = async () => { const point = await onRetryLocation(); if (point) { choose(point, point.locationName || "Current GPS location"); setGpsError(""); } else setGpsError("Could not get a fresh GPS reading. Check permission or keep using the current map pin."); };
  return <div className="place-location-backdrop" role="presentation" onClick={onClose}><section className="place-location-selector" role="dialog" aria-modal="true" aria-label="Set place location" onClick={(event) => event.stopPropagation()}>
    <header><h3>Set Location Manually</h3><button type="button" onClick={onClose} aria-label="Close"><X size={20}/></button></header>
    <label className="place-location-search">Search location<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search for a place" /></label>
    <p className="place-location-search-hint">{searching ? "Searching…" : "Search when online, or tap the map / drag the pin to choose coordinates."}</p>
    {error && <p className="place-location-error">{error}</p>}
    {gpsError && <p className="place-location-error" role="status">{gpsError}</p>}
    {results.length > 0 && <div className="place-location-results">{results.map((result) => <button type="button" key={`${result.latitude}-${result.longitude}`} onClick={() => choose({ latitude: Number(result.latitude), longitude: Number(result.longitude) }, result.locationName)}>{result.locationName}</button>)}</div>}
    <PlaceLocationMap coordinates={selected} onSelect={(point) => choose(point, "")} interactive height="min(52vh, 430px)" zoom={16}/>
    {selected && <p className="place-location-coordinates">Selected pin: {Number(selected.latitude).toFixed(6)}, {Number(selected.longitude).toFixed(6)}</p>}
    <div className="place-location-controls"><button type="button" className="place-location-retry" onClick={retry}><LocateFixed size={17}/> Retry Location</button><div><Button variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={!selected} onClick={() => onConfirm({ ...selected, locationName: query.trim() })}>Confirm Location</Button></div></div>
  </section></div>;
}
