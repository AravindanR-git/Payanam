import { useEffect, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { divIcon } from "leaflet";
import "leaflet/dist/leaflet.css";

const DEFAULT_CENTER = [20.5937, 78.9629];
const selectedPin = divIcon({ className: "place-selected-pin", html: "<span>●</span>", iconSize: [30, 30], iconAnchor: [15, 25] });

function MapInteraction({ onSelect }) {
  useMapEvents({ click(event) { onSelect({ latitude: event.latlng.lat, longitude: event.latlng.lng }); } });
  return null;
}

function Recenter({ coordinates }) {
  const map = useMap();
  useEffect(() => { if (coordinates) map.setView([coordinates.latitude, coordinates.longitude], Math.max(map.getZoom(), 15)); }, [coordinates?.latitude, coordinates?.longitude, map]);
  return null;
}

function DraggablePin({ coordinates, onSelect }) {
  return coordinates && <Marker position={[coordinates.latitude, coordinates.longitude]} icon={selectedPin} draggable eventHandlers={{ dragend(event) { const point = event.target.getLatLng(); onSelect({ latitude: point.lat, longitude: point.lng }); } }} />;
}

export default function PlaceLocationMap({ coordinates, onSelect, interactive = false, height = 190, zoom = 15, onTilesUnavailable }) {
  const center = coordinates ? [Number(coordinates.latitude), Number(coordinates.longitude)] : DEFAULT_CENTER;
  const [tilesFailed, setTilesFailed] = useState(false);
  return <div className="place-location-map-wrap" style={{ height }}>
    <MapContainer key={`${interactive}-${coordinates?.latitude ?? "none"}-${coordinates?.longitude ?? "none"}`} center={center} zoom={coordinates ? zoom : 4} scrollWheelZoom={interactive} dragging={interactive} doubleClickZoom={interactive} touchZoom={interactive} zoomControl={interactive} className="place-location-map">
      <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" eventHandlers={{ tileerror: () => { setTilesFailed(true); onTilesUnavailable?.(); } }} />
      {interactive && <MapInteraction onSelect={onSelect} />}
      {interactive && coordinates && <Recenter coordinates={coordinates} />}
      {coordinates && <DraggablePin coordinates={coordinates} onSelect={onSelect} />}
    </MapContainer>
    {tilesFailed && <div className="place-map-offline">Map tiles are unavailable. You can still set the pin and save coordinates.</div>}
    {!interactive && <div className="place-map-preview-shield" aria-hidden="true" />}
  </div>;
}
