import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import Input from "../Input/Input";
import TransportRepository from "../../database/repositories/TransportRepository";
import CategoryRepository from "../../database/repositories/CategoryRepository";
import ItemRepository from "../../database/repositories/ItemRepository";
import { imageFileToDataUrl } from "../../utils/imageData";
import "./TransportSetup.css";

const freshVehicle = () => ({ name: "", vehicleType: "Car", vehicleNumber: "", ownership: "rented", pricingMode: "perKm", ratePerKm: "", packageAmount: "", driverName: "", driverPhone: "", additionalPhone: "", driverBetaPerDay: "" });

const TransportSetup = forwardRef(function TransportSetup({ userId }, ref) {
  const [transports, setTransports] = useState([]);
  const [transportId, setTransportId] = useState("");
  const [newTransport, setNewTransport] = useState(false);
  const [vehicle, setVehicle] = useState(freshVehicle);
  const [setup, setSetup] = useState({ odometerStart: "0", estimatedDistance: "", manualDistance: "", tripDays: "1", driverBetaAmount: "" });
  const [items, setItems] = useState([]);
  const [includedIds, setIncludedIds] = useState([]);

  useEffect(() => {
    TransportRepository.list(userId).then(setTransports);
    CategoryRepository.getCategories(null, userId).then((categories) => {
      const category = categories.find((row) => row.id === "transport" || row.name.toLowerCase() === "transport");
      if (category) ItemRepository.getItems(category.id).then(setItems);
    });
  }, [userId]);

  const updateVehicle = (key, value) => setVehicle((current) => ({ ...current, [key]: value }));
  const updateSetup = (key, value) => setSetup((current) => ({ ...current, [key]: value }));
  const chooseTransport = (value) => {
    if (value === "new") { setNewTransport(true); setTransportId(""); setVehicle(freshVehicle()); setIncludedIds([]); return; }
    setNewTransport(false); setTransportId(value);
    const selected = transports.find((row) => row.id === value);
    setVehicle(selected ? { ...freshVehicle(), ...selected } : freshVehicle());
    setIncludedIds([]);
  };

  useImperativeHandle(ref, () => ({
    async getSnapshot() {
      if (!newTransport && !transportId) return null;
      if (newTransport && !vehicle.name.trim()) { alert("Enter a vehicle name."); return false; }
      if (vehicle.pricingMode === "perKm" && (!Number.isFinite(Number(vehicle.ratePerKm)) || Number(vehicle.ratePerKm) < 0)) { alert("Enter a valid rate per km."); return false; }
      if (vehicle.pricingMode === "package" && (!Number.isFinite(Number(vehicle.packageAmount)) || Number(vehicle.packageAmount) < 0)) { alert("Enter a valid package price."); return false; }
      if (Number(setup.odometerStart) < 0 || Number(setup.manualDistance) < 0 || Number(setup.driverBetaAmount) < 0) { alert("Distance, odometer and driver beta must be zero or greater."); return false; }
      let master = transports.find((row) => row.id === transportId);
      if (newTransport) master = await TransportRepository.save(vehicle, userId);
      if (!master) return null;
      const selectedItems = items.filter((item) => includedIds.includes(item.id)).map(({ id, name }) => ({ id, name }));
      const includedItems = Object.fromEntries(selectedItems.map((item) => [item.name.trim().toLowerCase(), true]));
      const beta = setup.driverBetaAmount === "" ? Number(vehicle.driverBetaPerDay || 0) * Number(setup.tripDays || 1) : Number(setup.driverBetaAmount);
      const startOdometer = Number(setup.odometerStart || 0);
      return { ...master, ...vehicle, includedItems, includedExpenseItems: selectedItems, estimatedDistance: Number(setup.estimatedDistance || setup.manualDistance || 0), odometerStart: startOdometer, currentOdometer: null, odometerEnd: null, currentDistance: Number(setup.manualDistance || setup.estimatedDistance || 0), manualDistance: Number(setup.manualDistance || 0), distanceMode: startOdometer > 0 ? "odometer" : "manual", tripDays: Number(setup.tripDays || 1), estimatedDriverBeta: beta, driverBetaAmount: beta, driverBetaManuallySet: setup.driverBetaAmount !== "", settlementStatus: "PENDING" };
    },
  }), [newTransport, transportId, vehicle, setup, transports, items, includedIds, userId]);

  return <section className="shared-transport-setup">
    <label className="segment-label">Transport (optional)
      <select value={newTransport ? "new" : transportId} onChange={(event) => chooseTransport(event.target.value)}>
        <option value="">No transport — walking or other travel</option>
        {transports.map((item) => <option key={item.id} value={item.id}>{item.name}{item.vehicleNumber ? ` · ${item.vehicleNumber}` : ""}</option>)}
        <option value="new">+ Add new vehicle</option>
      </select>
    </label>
    {(transportId || newTransport) && <div className="trip-transport-config">
      <h3>Transport agreement</h3>
      {newTransport && <>
        <Input label="Vehicle name *" value={vehicle.name} onChange={(e) => updateVehicle("name", e.target.value)} />
        <Input label="Vehicle type" value={vehicle.vehicleType} onChange={(e) => updateVehicle("vehicleType", e.target.value)} />
        <Input label="Vehicle number" value={vehicle.vehicleNumber} onChange={(e) => updateVehicle("vehicleNumber", e.target.value)} />
        <label className="vehicle-photo-button">Take vehicle photo<input type="file" accept="image/*" capture="environment" onChange={async (e) => { const file = e.target.files?.[0]; if (file) { try { updateVehicle("photo", await imageFileToDataUrl(file, 1000, 0.78)); } catch (error) { alert(error.message); } } e.target.value = ""; }} /></label>
        {vehicle.photo && <div className="vehicle-photo-preview"><img src={vehicle.photo} alt="Vehicle" /><button type="button" onClick={() => updateVehicle("photo", null)}>Remove</button></div>}
      </>}
      {!newTransport && vehicle.photo && <div className="vehicle-photo-preview"><img src={vehicle.photo} alt="Selected vehicle" /></div>}
      <label>Ownership<select value={vehicle.ownership || "own"} onChange={(e) => updateVehicle("ownership", e.target.value)}><option value="own">Private / own</option><option value="rented">Rented</option></select></label>
      <label>Pricing mode<select value={vehicle.pricingMode || "perKm"} onChange={(e) => updateVehicle("pricingMode", e.target.value)}><option value="perKm">Rate per km</option><option value="package">Package</option></select></label>
      {vehicle.pricingMode === "package" ? <Input label="Package price ₹" type="number" value={vehicle.packageAmount || ""} onChange={(e) => updateVehicle("packageAmount", e.target.value)} /> : <Input label="Rate per km ₹" type="number" value={vehicle.ratePerKm || ""} onChange={(e) => updateVehicle("ratePerKm", e.target.value)} />}
      <Input label="Driver name" value={vehicle.driverName || ""} onChange={(e) => updateVehicle("driverName", e.target.value)} />
      <Input label="Driver mobile" value={vehicle.driverPhone || ""} onChange={(e) => updateVehicle("driverPhone", e.target.value)} />
      <Input label="Additional driver mobile (optional)" value={vehicle.additionalPhone || ""} onChange={(e) => updateVehicle("additionalPhone", e.target.value)} />
      <Input label="Driver beta per day ₹" type="number" value={vehicle.driverBetaPerDay || ""} onChange={(e) => updateVehicle("driverBetaPerDay", e.target.value)} />
      <Input label="Expected trip days" type="number" value={setup.tripDays} onChange={(e) => updateSetup("tripDays", e.target.value)} />
      <Input label="Driver beta total ₹ (editable)" type="number" value={setup.driverBetaAmount} placeholder={String(Number(vehicle.driverBetaPerDay || 0) * Number(setup.tripDays || 1))} onChange={(e) => updateSetup("driverBetaAmount", e.target.value)} />
      <fieldset><legend>Included in vehicle agreement</legend>{items.map((item) => <label key={item.id} className="transport-item-option"><input type="checkbox" checked={includedIds.includes(item.id)} onChange={() => setIncludedIds((current) => current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id])} />{item.name}</label>)}</fieldset>
      <Input label="Start odometer (0 if unavailable)" type="number" value={setup.odometerStart} onChange={(e) => updateSetup("odometerStart", e.target.value)} />
      {vehicle.pricingMode !== "package" && <Input label="Estimated journey distance km" type="number" value={setup.estimatedDistance} onChange={(e) => updateSetup("estimatedDistance", e.target.value)} />}
      {Number(setup.odometerStart) === 0 && vehicle.pricingMode !== "package" && <Input label="Estimated/manual distance km" type="number" value={setup.manualDistance} onChange={(e) => updateSetup("manualDistance", e.target.value)} />}
    </div>}
  </section>;
});

export default TransportSetup;
