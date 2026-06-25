import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import api from "../services/api";

type DashboardUser = {
  id: string;
  name: string;
  email: string;
};

type VisitedPlace = {
  id: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  visitDate: string;
  notes: string;
  imageUrl?: string;
};

type ApiVisitedPlace = Omit<VisitedPlace, "latitude" | "longitude"> & {
  latitude: number | string;
  longitude: number | string;
};

type PlaceForm = {
  city: string;
  country: string;
  latitude: string;
  longitude: string;
  visitDate: string;
  notes: string;
  imageUrl: string;
};

type CountryCityOption = {
  country: string;
  cities: string[];
};

const currentLocationIcon = L.divIcon({
  className: "custom-map-marker current-location-marker",
  html: "<span></span>",
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -14],
});

const visitedPlaceIcon = L.divIcon({
  className: "custom-map-marker visited-place-marker",
  html: "<span></span>",
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -14],
});

const emptyForm: PlaceForm = {
  city: "",
  country: "",
  latitude: "",
  longitude: "",
  visitDate: "",
  notes: "",
  imageUrl: "",
};

function formatDate(date: string) {
  if (!date) {
    return "No date";
  }

  const dateValue = date.includes("T") ? new Date(date) : new Date(`${date}T00:00:00`);

  if (Number.isNaN(dateValue.getTime())) {
    return "No date";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(dateValue);
}

function toDateInputValue(date: string) {
  if (!date) {
    return "";
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }

  const dateValue = new Date(date);

  if (Number.isNaN(dateValue.getTime())) {
    return "";
  }

  return dateValue.toISOString().slice(0, 10);
}

function normalizePlace(place: ApiVisitedPlace): VisitedPlace {
  return {
    ...place,
    latitude: Number(place.latitude),
    longitude: Number(place.longitude),
  };
}

function MapFocus({ place }: { place: VisitedPlace | null }) {
  const map = useMap();

  useEffect(() => {
    if (place) {
      map.flyTo([place.latitude, place.longitude], 7, { duration: 0.8 });
    }
  }, [map, place]);

  return null;
}

function UserDashboard() {
  const navigate = useNavigate();

  const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null);
  const [locationError, setLocationError] = useState(() =>
    typeof navigator !== "undefined" && !navigator.geolocation ? "Geolocation is not supported by your browser" : ""
  );
  const [visitedPlaces, setVisitedPlaces] = useState<VisitedPlace[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlaceId, setEditingPlaceId] = useState<string | null>(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [form, setForm] = useState<PlaceForm>(emptyForm);
  const [formError, setFormError] = useState("");
  const [countryCityOptions, setCountryCityOptions] = useState<CountryCityOption[]>([]);
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(false);
  const [isLoadingSavedPlaces, setIsLoadingSavedPlaces] = useState(false);
  const [isSavingPlace, setIsSavingPlace] = useState(false);
  const [placeLookupMessage, setPlaceLookupMessage] = useState("");

  const user = useMemo<DashboardUser | null>(() => {
    const storedUser = localStorage.getItem("footprints_user");

    if (!storedUser) {
      return null;
    }

    try {
      return JSON.parse(storedUser) as DashboardUser;
    } catch {
      return null;
    }
  }, []);

  const displayName = user?.name || "Traveler";

  const sortedPlaces = useMemo(
    () =>
      [...visitedPlaces].sort(
        (a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime()
      ),
    [visitedPlaces]
  );

  const selectedPlace = useMemo(
    () => visitedPlaces.find((place) => place.id === selectedPlaceId) || null,
    [selectedPlaceId, visitedPlaces]
  );

  const availableCities = useMemo(() => {
    const selectedCountry = countryCityOptions.find((option) => option.country === form.country);
    return selectedCountry?.cities || [];
  }, [countryCityOptions, form.country]);

  const stats = useMemo(() => {
    const countries = new Set(visitedPlaces.map((place) => place.country.trim().toLowerCase()));
    const cities = new Set(
      visitedPlaces.map((place) => `${place.city.trim().toLowerCase()},${place.country.trim().toLowerCase()}`)
    );
    const mostRecentTrip = sortedPlaces[0];

    return {
      totalPlaces: visitedPlaces.length,
      totalCountries: countries.size,
      totalCities: cities.size,
      mostRecentTrip: mostRecentTrip ? `${mostRecentTrip.city}, ${mostRecentTrip.country}` : "No trips yet",
    };
  }, [sortedPlaces, visitedPlaces]);

  useEffect(() => {
    const loadSavedPlaces = async () => {
      const token = localStorage.getItem("footprints_token");

      if (!token) {
        navigate("/");
        return;
      }

      setIsLoadingSavedPlaces(true);

      try {
        const response = await api.get<{ locations: ApiVisitedPlace[] }>("/api/locations");
        setVisitedPlaces(response.data.locations.map(normalizePlace));
      } catch (error) {
        console.error(error);
        setLocationError("Could not load your saved places. Try signing in again.");
      } finally {
        setIsLoadingSavedPlaces(false);
      }
    };

    loadSavedPlaces();
  }, [navigate]);

  useEffect(() => {
    const loadCountryCityOptions = async () => {
      setIsLoadingPlaces(true);

      try {
        const response = await fetch("https://countriesnow.space/api/v0.1/countries");
        const result = await response.json();

        if (!Array.isArray(result.data)) {
          throw new Error("Invalid country city response");
        }

        const options = (result.data as CountryCityOption[])
          .map((option) => ({
            country: option.country,
            cities: [...option.cities].sort((a, b) => a.localeCompare(b)),
          }))
          .sort((a, b) => a.country.localeCompare(b.country));

        setCountryCityOptions(options);
      } catch (error) {
        console.error(error);
        setPlaceLookupMessage("Could not load country and city dropdowns. Try refreshing the page.");
      } finally {
        setIsLoadingPlaces(false);
      }
    };

    loadCountryCityOptions();
  }, []);

  useEffect(() => {
    const lookupCoordinates = async () => {
      if (!isModalOpen || !form.city || !form.country) {
        return;
      }

      setPlaceLookupMessage("Finding coordinates...");

      try {
        const query = encodeURIComponent(`${form.city}, ${form.country}`);
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${query}`
        );
        const results = (await response.json()) as Array<{ lat: string; lon: string }>;

        if (!results.length) {
          setPlaceLookupMessage("Coordinates were not found. You can enter them manually.");
          return;
        }

        setForm((currentForm) => ({
          ...currentForm,
          latitude: Number(results[0].lat).toFixed(6),
          longitude: Number(results[0].lon).toFixed(6),
        }));
        setPlaceLookupMessage("Coordinates filled automatically.");
      } catch (error) {
        console.error(error);
        setPlaceLookupMessage("Could not auto-fill coordinates. You can enter them manually.");
      }
    };

    lookupCoordinates();
  }, [form.city, form.country, isModalOpen]);

  useEffect(() => {
    if (!navigator.geolocation) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCurrentLocation([latitude, longitude]);
      },
      () => {
        setLocationError("Location permission denied");
      }
    );
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setFormError("");
    setPlaceLookupMessage("");
    setEditingPlaceId(null);
  };

  const openAddModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (place: VisitedPlace) => {
    setEditingPlaceId(place.id);
    setForm({
      city: place.city,
      country: place.country,
      latitude: String(place.latitude),
      longitude: String(place.longitude),
      visitDate: toDateInputValue(place.visitDate),
      notes: place.notes,
      imageUrl: place.imageUrl || "",
    });
    setFormError("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const handleFormChange = (field: keyof PlaceForm, value: string) => {
    setForm((currentForm) => ({ ...currentForm, [field]: value }));
  };

  const handleCountryChange = (country: string) => {
    setForm((currentForm) => ({
      ...currentForm,
      country,
      city: "",
      latitude: "",
      longitude: "",
    }));
    setPlaceLookupMessage("");
  };

  const handleCityChange = (city: string) => {
    setForm((currentForm) => ({
      ...currentForm,
      city,
      latitude: "",
      longitude: "",
    }));
    setPlaceLookupMessage("");
  };

  const handleSubmitPlace = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError("");

    const latitude = Number(form.latitude);
    const longitude = Number(form.longitude);

    if (!form.city.trim() || !form.country.trim() || !form.visitDate || !form.notes.trim()) {
      setFormError("City, country, visit date, and notes are required.");
      return;
    }

    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      setFormError("Latitude must be a number between -90 and 90.");
      return;
    }

    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      setFormError("Longitude must be a number between -180 and 180.");
      return;
    }

    const placePayload = {
      city: form.city.trim(),
      country: form.country.trim(),
      latitude,
      longitude,
      visitDate: form.visitDate,
      notes: form.notes.trim(),
      imageUrl: form.imageUrl.trim() || undefined,
    };

    setIsSavingPlace(true);

    try {
      const response = editingPlaceId
        ? await api.put<{ location: ApiVisitedPlace }>(`/api/locations/${editingPlaceId}`, placePayload)
        : await api.post<{ location: ApiVisitedPlace }>("/api/locations", placePayload);
      const savedPlace = normalizePlace(response.data.location);

      setVisitedPlaces((currentPlaces) =>
        editingPlaceId
          ? currentPlaces.map((currentPlace) => (currentPlace.id === editingPlaceId ? savedPlace : currentPlace))
          : [...currentPlaces, savedPlace]
      );
      setSelectedPlaceId(savedPlace.id);
      closeModal();
    } catch (error) {
      console.error(error);
      setFormError("Could not save this place to the database. Please try again.");
    } finally {
      setIsSavingPlace(false);
    }
  };

  const handleDeletePlace = async (placeId: string) => {
    try {
      await api.delete(`/api/locations/${placeId}`);
      setVisitedPlaces((currentPlaces) => currentPlaces.filter((place) => place.id !== placeId));

      if (selectedPlaceId === placeId) {
        setSelectedPlaceId(null);
      }
    } catch (error) {
      console.error(error);
      setLocationError("Could not delete that saved place. Please try again.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("footprints_token");
    localStorage.removeItem("footprints_user");
    navigate("/");
  };

  return (
    <div className="dashboard-page">
      <style>{`
        html,
        body,
        #root {
          width: 100%;
          max-width: none;
          min-height: 100%;
          border: 0;
        }

        .dashboard-page {
          min-height: 100svh;
          color: #24332f;
          background: #f6f7f2;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          text-align: left;
        }

        .dashboard-nav {
          height: 72px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          padding: 0 clamp(20px, 4vw, 56px);
          border-bottom: 1px solid rgba(36, 51, 47, 0.1);
          background: rgba(255, 255, 255, 0.86);
          backdrop-filter: blur(18px);
          position: sticky;
          top: 0;
          z-index: 500;
        }

        .brand {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          color: #213832;
          font-size: 18px;
          font-weight: 750;
          letter-spacing: 0;
          text-decoration: none;
        }

        .brand-pin {
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: #2f6f5e;
          box-shadow: 0 10px 22px rgba(47, 111, 94, 0.2);
        }

        .brand-pin::before {
          content: "";
          width: 12px;
          height: 12px;
          background:
            linear-gradient(#fff, #fff) center / 2px 12px no-repeat,
            linear-gradient(#fff, #fff) center / 12px 2px no-repeat;
          transform: rotate(45deg);
        }

        .nav-actions {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .nav-user {
          display: grid;
          gap: 2px;
          text-align: right;
        }

        .nav-user strong {
          color: #1e2c28;
          font-size: 14px;
          line-height: 1.2;
        }

        .nav-user span {
          color: #6b7b75;
          font-size: 12px;
          line-height: 1.2;
        }

        .button {
          min-height: 38px;
          border: 1px solid rgba(47, 111, 94, 0.18);
          border-radius: 8px;
          padding: 0 14px;
          color: #2f6f5e;
          background: #fff;
          font: inherit;
          font-size: 14px;
          font-weight: 750;
          cursor: pointer;
        }

        .button:hover {
          border-color: rgba(47, 111, 94, 0.35);
          background: #f2f7f4;
        }

        .button.primary {
          border-color: #24332f;
          color: #fff;
          background: #24332f;
        }

        .button.primary:hover {
          border-color: #2f6f5e;
          background: #2f6f5e;
        }

        .button.danger {
          color: #9f3a2f;
        }

        .dashboard-main {
          display: grid;
          gap: 22px;
          padding: clamp(20px, 3vw, 34px) clamp(20px, 4vw, 56px);
          box-sizing: border-box;
        }

        .dashboard-header {
          display: flex;
          align-items: end;
          justify-content: space-between;
          gap: 24px;
        }

        .dashboard-title {
          margin: 0;
          color: #1e2c28;
          font-size: clamp(30px, 4vw, 44px);
          line-height: 1.05;
          font-weight: 750;
          letter-spacing: 0;
        }

        .dashboard-copy {
          max-width: 620px;
          margin: 10px 0 0;
          color: #66766f;
          font-size: 16px;
          line-height: 1.55;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
        }

        .stat-card,
        .timeline-panel {
          border: 1px solid rgba(36, 51, 47, 0.1);
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.86);
        }

        .stat-card {
          padding: 16px;
        }

        .stat-card span {
          color: #6b7b75;
          font-size: 13px;
          font-weight: 700;
        }

        .stat-card strong {
          display: block;
          margin-top: 8px;
          color: #1e2c28;
          font-size: clamp(22px, 3vw, 30px);
          line-height: 1.1;
        }

        .dashboard-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(320px, 0.38fr);
          gap: 18px;
          align-items: start;
        }

        .map-shell {
          min-height: 560px;
          overflow: hidden;
          border: 1px solid rgba(36, 51, 47, 0.12);
          border-radius: 8px;
          background: #e9f1ea;
          box-shadow: 0 18px 45px rgba(36, 51, 47, 0.1);
        }

        .world-map,
        .leaflet-container {
          width: 100%;
          height: 100%;
          min-height: 560px;
          font: inherit;
        }

        .custom-map-marker {
          display: grid;
          place-items: center;
          border-radius: 50% 50% 50% 0;
          box-shadow: 0 8px 18px rgba(25, 36, 33, 0.24);
        }

        .custom-map-marker span {
          width: 10px;
          height: 10px;
          display: block;
          border-radius: 50%;
          background: #fff;
        }

        .current-location-marker {
          background: #2563eb;
          border: 3px solid #dbeafe;
        }

        .visited-place-marker {
          background: #dc2626;
          border: 3px solid #fee2e2;
        }

        .popup-title {
          margin: 0 0 4px;
          color: #1e2c28;
          font-size: 15px;
          font-weight: 750;
        }

        .popup-meta,
        .popup-notes {
          margin: 0;
          color: #52645f;
          font-size: 13px;
          line-height: 1.35;
        }

        .popup-image {
          width: 180px;
          height: 100px;
          object-fit: cover;
          border-radius: 6px;
          margin-top: 8px;
        }

        .timeline-panel {
          max-height: 560px;
          overflow: hidden;
          display: grid;
          grid-template-rows: auto minmax(0, 1fr);
        }

        .timeline-header {
          padding: 18px 18px 12px;
          border-bottom: 1px solid rgba(36, 51, 47, 0.08);
        }

        .timeline-header h2 {
          margin: 0;
          color: #1e2c28;
          font-size: 20px;
          line-height: 1.2;
          font-weight: 750;
        }

        .timeline-header p {
          margin: 6px 0 0;
          color: #66766f;
          font-size: 14px;
          line-height: 1.45;
        }

        .timeline-list {
          overflow: auto;
          padding: 10px;
        }

        .timeline-empty {
          margin: 0;
          padding: 12px 8px;
          color: #66766f;
          font-size: 14px;
          line-height: 1.5;
        }

        .timeline-item {
          width: 100%;
          border: 1px solid transparent;
          border-radius: 8px;
          padding: 12px;
          background: transparent;
          text-align: left;
          cursor: pointer;
        }

        .timeline-item:hover,
        .timeline-item.active {
          border-color: rgba(47, 111, 94, 0.18);
          background: #f2f7f4;
        }

        .timeline-item strong {
          display: block;
          color: #1e2c28;
          font-size: 15px;
          line-height: 1.25;
        }

        .timeline-date {
          display: block;
          margin-top: 4px;
          color: #2f6f5e;
          font-size: 13px;
          font-weight: 750;
        }

        .timeline-notes {
          margin: 7px 0 0;
          color: #66766f;
          font-size: 13px;
          line-height: 1.4;
        }

        .timeline-actions {
          display: flex;
          gap: 8px;
          margin-top: 10px;
        }

        .small-button {
          min-height: 30px;
          border: 1px solid rgba(47, 111, 94, 0.18);
          border-radius: 6px;
          padding: 0 10px;
          color: #2f6f5e;
          background: #fff;
          font: inherit;
          font-size: 12px;
          font-weight: 750;
          cursor: pointer;
        }

        .small-button.danger {
          color: #9f3a2f;
        }

        .location-error {
          margin: 0;
          color: #9f6a2f;
          font-size: 13px;
        }

        .modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 1000;
          display: grid;
          place-items: center;
          padding: 20px;
          background: rgba(25, 36, 33, 0.36);
        }

        .place-modal {
          width: min(560px, 100%);
          max-height: calc(100svh - 40px);
          overflow: auto;
          border-radius: 8px;
          background: #fff;
          box-shadow: 0 24px 80px rgba(25, 36, 33, 0.24);
        }

        .modal-header {
          display: flex;
          align-items: start;
          justify-content: space-between;
          gap: 16px;
          padding: 22px 22px 14px;
          border-bottom: 1px solid rgba(36, 51, 47, 0.08);
        }

        .modal-header h2 {
          margin: 0;
          color: #1e2c28;
          font-size: 24px;
          line-height: 1.15;
        }

        .modal-header p {
          margin: 6px 0 0;
          color: #66766f;
          font-size: 14px;
        }

        .icon-button {
          width: 34px;
          height: 34px;
          border: 1px solid rgba(36, 51, 47, 0.12);
          border-radius: 8px;
          background: #fff;
          color: #52645f;
          font-size: 22px;
          line-height: 1;
          cursor: pointer;
        }

        .place-form {
          display: grid;
          gap: 14px;
          padding: 18px 22px 22px;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .field {
          display: grid;
          gap: 6px;
        }

        .field.full {
          grid-column: 1 / -1;
        }

        .field label {
          color: #34443f;
          font-size: 13px;
          font-weight: 750;
        }

        .field input,
        .field select,
        .field textarea {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #d9ded6;
          border-radius: 8px;
          padding: 11px 12px;
          color: #1f2d29;
          background: #fbfcfa;
          font: inherit;
          font-size: 14px;
          outline: none;
        }

        .field select {
          appearance: none;
          background:
            linear-gradient(45deg, transparent 50%, #52645f 50%) right 16px center / 6px 6px no-repeat,
            linear-gradient(135deg, #52645f 50%, transparent 50%) right 11px center / 6px 6px no-repeat,
            #fbfcfa;
          padding-right: 34px;
        }

        .field select:disabled,
        .field input:disabled {
          cursor: not-allowed;
          color: #8a9692;
          background-color: #f1f3ef;
        }

        .field textarea {
          min-height: 88px;
          resize: vertical;
        }

        .field input:focus,
        .field select:focus,
        .field textarea:focus {
          border-color: #2f6f5e;
          background: #fff;
          box-shadow: 0 0 0 4px rgba(47, 111, 94, 0.12);
        }

        .form-error {
          margin: 0;
          color: #9f3a2f;
          font-size: 14px;
          line-height: 1.45;
        }

        .lookup-message {
          margin: 0;
          color: #66766f;
          font-size: 13px;
          line-height: 1.45;
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }

        @media (max-width: 980px) {
          .stats-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .dashboard-grid {
            grid-template-columns: 1fr;
          }

          .timeline-panel {
            max-height: none;
          }
        }

        @media (max-width: 760px) {
          .dashboard-nav {
            height: auto;
            align-items: flex-start;
            flex-direction: column;
            padding-block: 16px;
          }

          .nav-actions {
            width: 100%;
            justify-content: space-between;
          }

          .nav-user {
            text-align: left;
          }

          .dashboard-main {
            gap: 16px;
          }

          .dashboard-header {
            align-items: flex-start;
            flex-direction: column;
            gap: 14px;
          }

          .stats-grid,
          .form-grid {
            grid-template-columns: 1fr;
          }

          .map-shell,
          .world-map,
          .leaflet-container {
            min-height: 420px;
          }
        }
      `}</style>

      <nav className="dashboard-nav" aria-label="Dashboard navigation">
        <a className="brand" href="/dashboard">
          <span className="brand-pin" />
          Footprints
        </a>

        <div className="nav-actions">
          <div className="nav-user">
            <strong>{displayName}</strong>
            <span>{user?.email || "Your travel dashboard"}</span>
          </div>
          <button className="button" type="button" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </nav>

      <main className="dashboard-main">
        <section className="dashboard-header">
          <div>
            <h1 className="dashboard-title">Your world map</h1>
            <p className="dashboard-copy">
              Welcome back, {displayName}. Pin places you have visited, keep the details, and follow your memories
              across the map.
            </p>
            {locationError && <p className="location-error">{locationError}</p>}
          </div>

          <button className="button primary" type="button" onClick={openAddModal}>
            Add visited place
          </button>
        </section>

        <section className="stats-grid" aria-label="Travel stats">
          <div className="stat-card">
            <span>Total places visited</span>
            <strong>{stats.totalPlaces}</strong>
          </div>
          <div className="stat-card">
            <span>Total countries visited</span>
            <strong>{stats.totalCountries}</strong>
          </div>
          <div className="stat-card">
            <span>Total cities visited</span>
            <strong>{stats.totalCities}</strong>
          </div>
          <div className="stat-card">
            <span>Most recent trip</span>
            <strong>{stats.mostRecentTrip}</strong>
          </div>
        </section>

        <section className="dashboard-grid">
          <div className="map-shell" aria-label="World map">
            <MapContainer
              className="world-map"
              center={currentLocation || [20, 0]}
              zoom={currentLocation ? 13 : 2}
              minZoom={2}
              scrollWheelZoom
            >
              <MapFocus place={selectedPlace} />
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {currentLocation && (
                <Marker position={currentLocation} icon={currentLocationIcon}>
                  <Popup>You are here</Popup>
                </Marker>
              )}

              {visitedPlaces.map((place) => (
                <Marker
                  key={place.id}
                  position={[place.latitude, place.longitude]}
                  icon={visitedPlaceIcon}
                  eventHandlers={{ click: () => setSelectedPlaceId(place.id) }}
                >
                  <Popup>
                    <h3 className="popup-title">
                      {place.city}, {place.country}
                    </h3>
                    <p className="popup-meta">{formatDate(place.visitDate)}</p>
                    <p className="popup-notes">{place.notes}</p>
                    {place.imageUrl && <img className="popup-image" src={place.imageUrl} alt={`${place.city} memory`} />}
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>

          <aside className="timeline-panel" aria-label="Visited places timeline">
            <div className="timeline-header">
              <h2>Timeline</h2>
              <p>Sorted by visit date. Select a place to focus the map.</p>
            </div>

            <div className="timeline-list">
              {isLoadingSavedPlaces ? (
                <p className="timeline-empty">Loading your saved places...</p>
              ) : sortedPlaces.length === 0 ? (
                <p className="timeline-empty">No visited places yet. Add your first memory to begin your map.</p>
              ) : (
                sortedPlaces.map((place) => (
                  <article
                    className={`timeline-item ${selectedPlaceId === place.id ? "active" : ""}`}
                    key={place.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedPlaceId(place.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        setSelectedPlaceId(place.id);
                      }
                    }}
                  >
                    <strong>
                      {place.city}, {place.country}
                    </strong>
                    <span className="timeline-date">{formatDate(place.visitDate)}</span>
                    <p className="timeline-notes">{place.notes}</p>
                    <div className="timeline-actions">
                      <button
                        className="small-button"
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          openEditModal(place);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="small-button danger"
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDeletePlace(place.id);
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </aside>
        </section>
      </main>

      {isModalOpen && (
        <div className="modal-backdrop" role="presentation">
          <section className="place-modal" role="dialog" aria-modal="true" aria-labelledby="place-modal-title">
            <div className="modal-header">
              <div>
                <h2 id="place-modal-title">{editingPlaceId ? "Edit visited place" : "Add visited place"}</h2>
                <p>Save the coordinates and memory details for your timeline.</p>
              </div>
              <button className="icon-button" type="button" aria-label="Close modal" onClick={closeModal}>
                x
              </button>
            </div>

            <form className="place-form" onSubmit={handleSubmitPlace}>
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="country">Country</label>
                  <select
                    id="country"
                    value={form.country}
                    onChange={(event) => handleCountryChange(event.target.value)}
                    disabled={isLoadingPlaces}
                    required
                  >
                    <option value="">{isLoadingPlaces ? "Loading countries..." : "Select country"}</option>
                    {form.country && !countryCityOptions.some((option) => option.country === form.country) && (
                      <option value={form.country}>{form.country}</option>
                    )}
                    {countryCityOptions.map((option) => (
                      <option key={option.country} value={option.country}>
                        {option.country}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="city">City</label>
                  <select
                    id="city"
                    value={form.city}
                    onChange={(event) => handleCityChange(event.target.value)}
                    disabled={!form.country || isLoadingPlaces}
                    required
                  >
                    <option value="">{form.country ? "Select city" : "Select country first"}</option>
                    {form.city && !availableCities.includes(form.city) && <option value={form.city}>{form.city}</option>}
                    {availableCities.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="latitude">Latitude</label>
                  <input
                    id="latitude"
                    type="number"
                    step="any"
                    min="-90"
                    max="90"
                    value={form.latitude}
                    onChange={(event) => handleFormChange("latitude", event.target.value)}
                    required
                  />
                </div>

                <div className="field">
                  <label htmlFor="longitude">Longitude</label>
                  <input
                    id="longitude"
                    type="number"
                    step="any"
                    min="-180"
                    max="180"
                    value={form.longitude}
                    onChange={(event) => handleFormChange("longitude", event.target.value)}
                    required
                  />
                </div>

                <div className="field">
                  <label htmlFor="visit-date">Visit date</label>
                  <input
                    id="visit-date"
                    type="date"
                    value={form.visitDate}
                    onChange={(event) => handleFormChange("visitDate", event.target.value)}
                    required
                  />
                </div>

                <div className="field">
                  <label htmlFor="image-url">Image URL</label>
                  <input
                    id="image-url"
                    type="url"
                    value={form.imageUrl}
                    onChange={(event) => handleFormChange("imageUrl", event.target.value)}
                    placeholder="Optional"
                  />
                </div>

                <div className="field full">
                  <label htmlFor="notes">Notes</label>
                  <textarea
                    id="notes"
                    value={form.notes}
                    onChange={(event) => handleFormChange("notes", event.target.value)}
                    required
                  />
                </div>
              </div>

              {placeLookupMessage && <p className="lookup-message">{placeLookupMessage}</p>}
              {formError && <p className="form-error">{formError}</p>}

              <div className="modal-actions">
                <button className="button" type="button" onClick={closeModal}>
                  Cancel
                </button>
                <button className="button primary" type="submit" disabled={isSavingPlace}>
                  {isSavingPlace ? "Saving..." : editingPlaceId ? "Save changes" : "Add place"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

export default UserDashboard;
