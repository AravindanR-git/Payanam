import "./Places.css";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Pencil, Trash2, MapPin, Map, X, Star, LocateFixed, BookOpen } from "lucide-react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import PlaceRepository from "../../database/repositories/PlaceRepository";
import AddPlaceSheet from "../../components/AddPlaceSheet/AddPlaceSheet";
import LocationService from "../../services/LocationService";
import db from "../../database/db";
import useLanguage from "../../i18n/useLanguage";

const DISTANCES = [1, 5, 10, 25, 50];
const distanceKm = (a, b) => { const rad = (n) => n * Math.PI / 180; const dLat = rad(b.latitude - a.latitude), dLon = rad(b.longitude - a.longitude); const x = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2; return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x)); };
function MapFit({ places }) { const map = useMap(); useEffect(() => { if (!places.length) return; const bounds = places.map((p) => [Number(p.latitude), Number(p.longitude)]); if (bounds.length === 1) map.setView(bounds[0], 13); else map.fitBounds(bounds, { padding: [30, 30], maxZoom: 13 }); }, [places, map]); return null; }
function Places() {
  const navigate = useNavigate(); const { t } = useLanguage();
  const [places, setPlaces] = useState([]); const [trips, setTrips] = useState([]); const [categories, setCategories] = useState([]);
  const [showSheet, setShowSheet] = useState(false); const [selectedPlace, setSelectedPlace] = useState(null); const [detail, setDetail] = useState(null);
  const [tripFilter, setTripFilter] = useState("all"); const [categoryFilter, setCategoryFilter] = useState("all"); const [ratingFilter, setRatingFilter] = useState("all");
  const [nearby, setNearby] = useState(false); const [radius, setRadius] = useState(5); const [origin, setOrigin] = useState(null); const [locationError, setLocationError] = useState(""); const [mapOpen, setMapOpen] = useState(false);
  useEffect(() => { loadPlaces(); }, []);
  const loadPlaces = async () => { const [list, cats, tripList] = await Promise.all([PlaceRepository.getPlaces(), PlaceRepository.getCategories(), db.trips.toArray()]); setPlaces(list); setCategories(cats); setTrips(tripList); };
  const filtered = useMemo(() => places.filter((p) => (tripFilter === "all" || p.tripId === tripFilter) && (categoryFilter === "all" || p.categoryName === categoryFilter) && (ratingFilter === "all" || (p.rating && p.rating >= Number(ratingFilter))) && (!nearby || (origin && Number.isFinite(Number(p.latitude)) && Number.isFinite(Number(p.longitude)) && distanceKm(origin, { latitude: Number(p.latitude), longitude: Number(p.longitude) }) <= radius))), [places, tripFilter, categoryFilter, ratingFilter, nearby, origin, radius]);
  const grouped = useMemo(() => filtered.reduce((acc, p) => { const trip = trips.find((t) => t.id === p.tripId); const key = trip?.tripName || "Trip"; (acc[key] ||= []).push(p); return acc; }, {}), [filtered, trips]);
  const locate = async () => { try { const position = await LocationService.getCurrentLocation(); setOrigin({ latitude: Number(position.latitude), longitude: Number(position.longitude) }); setLocationError(""); setNearby(true); } catch (e) { setLocationError(e?.message || "Could not get current location."); } };
  const editPlace = (place) => { setDetail(null); setSelectedPlace(place); setShowSheet(true); };
  const deletePlace = async (place) => { if (!window.confirm(t("deletePlaceConfirm", { name: place.name }))) return; await PlaceRepository.deletePlace(place.id); setDetail(null); await loadPlaces(); };
  const openAdd = () => { setSelectedPlace(null); setShowSheet(true); };
  const validMapPlaces = filtered.filter((p) => Number.isFinite(Number(p.latitude)) && Number.isFinite(Number(p.longitude)));
  return <div className="items-page places-page">
    <button className="back-btn" onClick={() => navigate(-1)}><ArrowLeft size={20}/></button>
    <div className="items-header"><h1>Trip Places</h1><p>Save memorable places with photos, ratings, notes, and exact locations.</p><button className="places-help-link" onClick={() => navigate("/guide#places")}><BookOpen size={15}/> Location help</button></div>
    <section className="places-filters">
      <label>Trip<select value={tripFilter} onChange={(e) => setTripFilter(e.target.value)}><option value="all">All trips</option>{trips.map((trip) => <option key={trip.id} value={trip.id}>{trip.tripName}</option>)}</select></label>
      <label>Category<select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}><option value="all">All categories</option>{categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}{places.map((p) => p.categoryName).filter((name, i, all) => name && !categories.some((c) => c.name === name) && all.indexOf(name) === i).map((name) => <option key={name}>{name}</option>)}</select></label>
      <label>Rating<select value={ratingFilter} onChange={(e) => setRatingFilter(e.target.value)}><option value="all">Any rating</option><option value="5">5 stars</option><option value="4">4+ stars</option><option value="3">3+ stars</option></select></label>
      <div className="places-near"><button className={nearby ? "active" : ""} onClick={nearby ? () => setNearby(false) : locate}><LocateFixed size={16}/> {nearby ? "Near me: on" : "Places Near Me"}</button>{nearby && <select value={radius} onChange={(e) => setRadius(Number(e.target.value))}>{DISTANCES.map((km) => <option key={km} value={km}>{km} km</option>)}</select>}</div>
      <button className="places-map-toggle" onClick={() => setMapOpen(true)}><Map size={17}/> Map ({validMapPlaces.length})</button>
      {locationError && <small className="places-error">{locationError}</small>}
    </section>
    {filtered.length === 0 ? <div className="empty-card"><MapPin size={48}/><h3>{places.length ? "No matching places" : "No Places Saved Yet"}</h3><p>{places.length ? "Try changing the trip, category, or rating filters." : "Keep the places that made your trip memorable. Add photos, notes, ratings, and a location you can revisit."}</p>{!places.length && <button onClick={openAdd}><Plus size={17}/> Add Place</button>}</div> : Object.entries(grouped).map(([tripName, tripPlaces]) => <section className="places-trip-group" key={tripName}><h2>{tripName}</h2><div className="places-grid">{tripPlaces.map((place) => <button className="place-card" key={place.id} onClick={() => setDetail(place)}><div className="place-card-photo">{place.photo ? <img src={place.photo} alt="" loading="lazy"/> : <MapPin size={28}/>}</div><div className="place-card-info"><strong>{place.name}</strong><span>{place.categoryName}</span>{place.rating && <span className="place-stars">{"★".repeat(place.rating)}{"☆".repeat(5 - place.rating)}</span>}<small>{place.capturedAt ? new Date(place.capturedAt).toLocaleDateString() : ""}{place.latitude != null ? ` · ${Number(place.latitude).toFixed(4)}, ${Number(place.longitude).toFixed(4)}` : ""}</small></div><span className="place-edit" onClick={(e) => { e.stopPropagation(); editPlace(place); }}><Pencil size={16}/></span></button>)}</div></section>)}
    <button className="floating-btn" onClick={openAdd}><Plus size={26}/></button>
    <AddPlaceSheet isOpen={showSheet} onClose={() => { setShowSheet(false); setSelectedPlace(null); }} place={selectedPlace} onSaved={loadPlaces}/>
    {detail && <div className="places-overlay" onClick={() => setDetail(null)}><section className="place-detail" onClick={(e) => e.stopPropagation()}><button className="place-close" onClick={() => setDetail(null)}><X/></button>{detail.photo && <img className="place-detail-photo" src={detail.photo} alt={detail.name}/>}<h2>{detail.name}</h2><p>{detail.categoryName}{detail.rating ? ` · ${"★".repeat(detail.rating)}` : ""}</p>{detail.description && <p>{detail.description}</p>}<p>{trips.find((trip) => trip.id === detail.tripId)?.tripName || "Trip"}</p><p>{detail.capturedAt ? new Date(detail.capturedAt).toLocaleString() : ""}</p>{detail.address && <p>{detail.address}</p>}{detail.latitude != null && <p>{Number(detail.latitude).toFixed(6)}, {Number(detail.longitude).toFixed(6)}</p>}<div className="place-detail-actions"><button onClick={() => editPlace(detail)}><Pencil size={16}/> Edit</button><button onClick={() => deletePlace(detail)}><Trash2 size={16}/> Delete</button></div></section></div>}
    {mapOpen && <div className="places-overlay" onClick={() => setMapOpen(false)}><section className="places-map-dialog" onClick={(e) => e.stopPropagation()}><header><h2>Saved Places Map</h2><button onClick={() => setMapOpen(false)}><X/></button></header>{validMapPlaces.length ? <MapContainer center={[Number(validMapPlaces[0].latitude), Number(validMapPlaces[0].longitude)]} zoom={6} scrollWheelZoom className="places-map"><TileLayer attribution='&copy; OpenStreetMap contributors' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"/><MapFit places={validMapPlaces}/>{validMapPlaces.map((place) => <Marker key={place.id} position={[Number(place.latitude), Number(place.longitude)]}><Popup><div className="place-popup">{place.photo && <img src={place.photo} alt=""/>}<strong>{place.name}</strong><span>{place.categoryName}{place.rating ? ` · ${"★".repeat(place.rating)}` : ""}</span><button onClick={() => { setMapOpen(false); setDetail(place); }}>Details</button></div></Popup></Marker>)}</MapContainer> : <p>No filtered places have coordinates.</p>}</section></div>}
  </div>;
}
export default Places;
