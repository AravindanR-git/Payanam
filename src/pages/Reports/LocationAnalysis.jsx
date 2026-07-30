import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
} from "react-leaflet";
import { divIcon } from "leaflet";
import "leaflet/dist/leaflet.css";
import "./LocationAnalysis.css";
import InsightsNav from "../../components/Insights/InsightsNav";
import ExpenseRepository from "../../database/repositories/ExpenseRepository";

const INDIA_CENTER = [20.5937, 78.9629];

function MapBounds({ locations }) {
  const map = useMap();

  useEffect(() => {
    if (locations.length === 0) {
      return;
    }

    if (locations.length === 1) {
      map.setView(
        [locations[0].latitude, locations[0].longitude],
        13
      );
      return;
    }

    map.fitBounds(
      locations.map((location) => [
        location.latitude,
        location.longitude,
      ]),
      { padding: [32, 32] }
    );
  }, [locations, map]);

  return null;
}

function createAmountIcon(amount) {
  const label = `₹${Number(amount).toLocaleString("en-IN")}`;

  return divIcon({
    className: "location-map-marker",
    html: `<span>${label}</span>`,
    iconSize: [72, 34],
    iconAnchor: [36, 34],
  });
}

export default function LocationAnalysis() {
  const { tripId } = useParams();

  const [locations, setLocations] = useState([]);
  const [mapLocations, setMapLocations] = useState([]);
  const [selectedMapLocation, setSelectedMapLocation] =
    useState(null);

  useEffect(() => {
    loadLocations();
  }, []);

  async function loadLocations() {
    const expenses =
      await ExpenseRepository.getExpensesByTrip(tripId);

    const map = {};
    const coordinateMap = new Map();

    expenses.forEach((expense) => {
      const location =
        expense.locationName?.trim() || "Unknown";

      if (!map[location]) {
        map[location] = {
          amount: 0,
          count: 0,
        };
      }

      map[location].amount += Number(expense.amount || 0);
      map[location].count += 1;

      const hasCoordinates =
        expense.latitude !== null &&
        expense.latitude !== undefined &&
        expense.longitude !== null &&
        expense.longitude !== undefined;

      if (!hasCoordinates) {
        return;
      }

      const latitude = Number(expense.latitude);
      const longitude = Number(expense.longitude);

      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return;
      }

      const coordinateKey = `${latitude.toFixed(6)},${longitude.toFixed(6)}`;
      const existing = coordinateMap.get(coordinateKey) || {
        id: coordinateKey,
        latitude,
        longitude,
        location,
        amount: 0,
        count: 0,
        expenses: [],
      };

      existing.amount += Number(expense.amount || 0);
      existing.count += 1;
      existing.expenses.push(expense);

      coordinateMap.set(coordinateKey, existing);
    });

    const result = Object.entries(map)
      .map(([location, value]) => ({
        location,
        amount: value.amount,
        count: value.count,
      }))
      .sort((a, b) => b.amount - a.amount);

    setLocations(result);

    const gpsLocations = [...coordinateMap.values()].sort(
      (a, b) => b.amount - a.amount
    );

    setMapLocations(gpsLocations);
    setSelectedMapLocation(gpsLocations[0] || null);
  }

  const totalSpent = locations.reduce(
    (sum, item) => sum + item.amount,
    0
  );

  return (
    <div className="location-page">
        <InsightsNav />
      <h2>Location Insights</h2>

      <div className="location-map-card">
        <div className="location-map-header">
          <div>
            <h3>Expense Map</h3>
            <p>Tap a marker to view its expenses.</p>
          </div>
          <span>{mapLocations.length} GPS locations</span>
        </div>

        <MapContainer
          className="location-map"
          center={INDIA_CENTER}
          zoom={5}
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapBounds locations={mapLocations} />

          {mapLocations.map((location) => (
            <Marker
              key={location.id}
              position={[location.latitude, location.longitude]}
              icon={createAmountIcon(location.amount)}
              eventHandlers={{
                click: () => setSelectedMapLocation(location),
              }}
            />
          ))}
        </MapContainer>

        {mapLocations.length === 0 && (
          <p className="location-map-empty">
            No saved GPS locations yet. Manual and unknown locations
            remain available in the list below.
          </p>
        )}
      </div>

      {selectedMapLocation && (
        <div className="location-expense-summary">
          <div className="location-summary-heading">
            <div>
              <span>Selected location</span>
              <h3>{selectedMapLocation.location}</h3>
            </div>
            <strong>
              ₹{selectedMapLocation.amount.toLocaleString("en-IN")}
            </strong>
          </div>

          <p>
            {selectedMapLocation.count} expense
            {selectedMapLocation.count !== 1 ? "s" : ""}
          </p>

          <div className="location-expense-items">
            {selectedMapLocation.expenses.map((expense) => (
              <div key={expense.id}>
                <span>
                  {expense.selectedItems?.length
                    ? expense.selectedItems
                        .map((item) => item.name)
                        .join(", ")
                    : "Expense"}
                </span>
                <strong>
                  ₹{Number(expense.amount || 0).toLocaleString("en-IN")}
                </strong>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="summary-card">
        <h3>{locations.length}</h3>
        <p>Locations Visited</p>

        <h4>₹{totalSpent.toLocaleString("en-IN")}</h4>
        <span>Total Spending</span>
      </div>

      <div className="location-list">
        {locations.map((item, index) => (
          <div className="location-card" key={item.location}>
            <div className="location-left">
              <div className="rank">
                #{index + 1}
              </div>

              <div>
                <h4>{item.location}</h4>

                <small>
                  {item.count} expense
                  {item.count > 1 ? "s" : ""}
                </small>
              </div>
            </div>

            <strong>
              ₹{item.amount.toLocaleString("en-IN")}
            </strong>
          </div>
        ))}
      </div>
    </div>
  );
}
