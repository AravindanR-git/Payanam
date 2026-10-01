import { useEffect, useState } from "react";
import { Camera, LocateFixed, MapPin, Star, X } from "lucide-react";
import BottomSheet from "../BottomSheet/BottomSheet";
import Button from "../Button/Button";
import PlaceRepository from "../../database/repositories/PlaceRepository";
import LocationService from "../../services/LocationService";
import { imageFileToDataUrl } from "../../utils/imageData";
import { useAuth } from "../../contexts/useAuth";
import db from "../../database/db";
import useLanguage from "../../i18n/useLanguage";
import PlaceLocationMap from "./PlaceLocationMap";
import PlaceLocationSelector from "./PlaceLocationSelector";
import "./AddPlaceSheet.css";

export default function AddPlaceSheet({ isOpen, onClose, place = null, trip = null, onSaved }) {
  const { t } = useLanguage(); const { user } = useAuth();
  const [name, setName] = useState(""); const [categories, setCategories] = useState([]); const [categoryId, setCategoryId] = useState("");
  const [latitude, setLatitude] = useState(null); const [longitude, setLongitude] = useState(null); const [accuracy, setAccuracy] = useState(null); const [address, setAddress] = useState(""); const [locationSource, setLocationSource] = useState("none");
  const [photo, setPhoto] = useState(null); const [rating, setRating] = useState(null); const [description, setDescription] = useState(""); const [capturing, setCapturing] = useState(false); const [locationError, setLocationError] = useState(""); const [showLocationSelector, setShowLocationSelector] = useState(false);
  const [trips, setTrips] = useState([]); const [selectedTripId, setSelectedTripId] = useState("");

  const requestGpsLocation = async (forceRefresh = true) => {
    setCapturing(true); setLocationError("");
    try {
      const location = await LocationService.getCurrentLocation(forceRefresh);
      if (location.latitude == null || location.longitude == null || (forceRefresh && location.source === "cache-fallback")) {
        setLocationError(forceRefresh && location.source === "cache-fallback"
          ? "A fresh GPS reading was unavailable. Your previous selected location is unchanged."
          : "Could not detect your location. Check location permission or move the pin manually.");
        return null;
      }
      const lat = Number(location.latitude); const lon = Number(location.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        setLocationError("Could not detect your location. Check location permission or move the pin manually.");
        return null;
      }
      const point = { latitude: lat, longitude: lon, accuracy: location.accuracy ?? null, locationName: location.locationName || "" };
      setLatitude(point.latitude); setLongitude(point.longitude); setAccuracy(point.accuracy); setAddress(point.locationName); setLocationSource(location.source || "gps");
      return point;
    } catch (error) {
      setLocationError(error?.message || "Could not detect your location. Check location permission or retry.");
      return null;
    } finally { setCapturing(false); }
  };

  useEffect(() => {
    if (!isOpen) { setShowLocationSelector(false); return; }
    let active = true;
    (async () => {
      const [rows, tripRows] = await Promise.all([PlaceRepository.getCategories(), db.trips.toArray()]);
      if (!active) return;
      setCategories(rows); setTrips(tripRows); setSelectedTripId(trip?.id || place?.tripId || tripRows[0]?.id || "");
      setName(place?.name || ""); setCategoryId(place?.categoryId || rows[0]?.id || ""); setLatitude(place?.latitude ?? null); setLongitude(place?.longitude ?? null); setAccuracy(place?.accuracy ?? null); setAddress(place?.address || place?.locationName || ""); setLocationSource(place ? "saved" : "none"); setPhoto(place?.photo || null); setRating(place?.rating ?? null); setDescription(place?.description || ""); setLocationError("");
      if (!place) await requestGpsLocation(false);
    })();
    return () => { active = false; };
  }, [isOpen, place]);

  const takePhoto = async (event) => { const file = event.target.files?.[0]; if (!file) return; try { setPhoto(await imageFileToDataUrl(file, 1000, 0.78)); } catch (error) { alert(error.message); } event.target.value = ""; };
  const addCategory = async () => { const value = window.prompt("New place category name"); if (!value?.trim()) return; try { const row = await PlaceRepository.addCategory(value, user?.id); setCategories(await PlaceRepository.getCategories()); setCategoryId(row.id); } catch (error) { alert(error.message); } };
  const confirmManualLocation = (selected) => { setLatitude(Number(selected.latitude)); setLongitude(Number(selected.longitude)); setAccuracy(null); setAddress(selected.locationName || "Manual location selected"); setLocationSource("manual"); setLocationError(""); setShowLocationSelector(false); };
  const savePlace = async () => {
    try {
      await PlaceRepository.save({ id: place?.id, tripId: trip?.id || place?.tripId || selectedTripId, name, categoryId, latitude, longitude, accuracy, address, locationName: address, locationSource, photo, rating, description, capturedAt: place?.capturedAt || new Date().toISOString() }, user?.id);
      if (onSaved) await onSaved(); onClose();
    } catch (error) { alert(error.message); }
  };
  const hasCoordinates = latitude != null && longitude != null;

  return <>
    <BottomSheet isOpen={isOpen} onClose={onClose} title={place ? "Place details" : "Add Place"}>
      {!place && trip && <p className="place-trip-label">Trip: {trip.tripName}</p>}
      {!trip && !place && <label className="place-field">Trip<select value={selectedTripId} onChange={(event) => setSelectedTripId(event.target.value)}>{trips.map((item) => <option key={item.id} value={item.id}>{item.tripName}</option>)}</select></label>}
      <label className="place-field">Place name<input className="sheet-input" placeholder="Place name" value={name} onChange={(event) => setName(event.target.value)} /></label>
      <label className="place-field">Category<select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><button type="button" className="place-add-category" onClick={addCategory}>+ Add category</button>
      <section className="place-location-section"><div className="place-location-heading"><MapPin size={18}/><strong>Location</strong><span>{capturing ? "Detecting GPS…" : locationSource === "manual" ? "Manual location selected" : locationSource === "gps" ? "Current GPS location" : locationSource === "cache" || locationSource === "cache-fallback" ? "Last detected device location" : locationSource === "saved" ? "Saved location" : hasCoordinates ? "Location selected" : "Location unavailable"}</span></div>
        <PlaceLocationMap coordinates={hasCoordinates ? { latitude, longitude } : null} height={170}/>
        <div className="place-location-info">{capturing ? "Getting current device location…" : hasCoordinates ? <>{address || (locationSource === "manual" ? "Manual location selected" : "GPS location")}<br/><small>{Number(latitude).toFixed(6)}, {Number(longitude).toFixed(6)}</small>{accuracy != null && <small className="place-accuracy">Location accuracy: ±{Math.round(accuracy)} m</small>}</> : "Location could not be detected. You can retry or set it on the map."}</div>
        {locationError && <p className="place-location-error" role="status">{locationError}</p>}
        <div className="place-location-actions"><button type="button" disabled={capturing} onClick={requestGpsLocation}><LocateFixed size={16}/>{capturing ? "Getting location…" : "Retry Location"}</button><button type="button" onClick={() => setShowLocationSelector(true)}>{hasCoordinates ? "Edit Location" : "Set Location Manually"}</button></div>
      </section>
      <label className="place-field">Address / place label<input className="sheet-input" value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Optional address" /></label>
      <div className="place-rating"><span>Rating (optional)</span>{[1,2,3,4,5].map((value) => <button type="button" key={value} aria-label={`${value} stars`} onClick={() => setRating(rating === value ? null : value)}><Star size={22} fill={rating >= value ? "currentColor" : "none"} /></button>)}{rating && <button type="button" onClick={() => setRating(null)}>Clear</button>}</div>
      <label className="place-field">Description<textarea rows="3" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Notes about this place" /></label>
      <label className="place-photo-picker"><Camera size={18} />{photo ? "Change photo" : "Take photo"}<input type="file" accept="image/*" capture="environment" onChange={takePhoto} /></label>
      {photo && <div className="place-photo-preview"><img src={photo} alt="Place" /><button type="button" aria-label="Remove photo" onClick={() => setPhoto(null)}><X size={16} /></button></div>}
      <Button onClick={savePlace}>{place ? "Save changes" : t("savePlace")}</Button>
    </BottomSheet>
    {isOpen && showLocationSelector && <PlaceLocationSelector coordinates={hasCoordinates ? { latitude, longitude } : null} locationName={address} onRetryLocation={requestGpsLocation} onConfirm={confirmManualLocation} onClose={() => setShowLocationSelector(false)} />}
  </>;
}
