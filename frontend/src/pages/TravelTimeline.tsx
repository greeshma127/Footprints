import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import L from "leaflet";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import api from "../services/api";
import TripManager from "../components/TripManager";
import { type Trip } from "../services/trips";

type TimelineUser = {
  id: string;
  name: string;
  email: string;
};

type CityLocation = {
  id: string;
  name: string;
  category: string;
  visitDate: string;
  timeOfVisit: string;
  duration: string;
  review: string;
  photoUrl?: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
};

type VisitedPlace = {
  id: string;
  tripId?: string;
  tripName?: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  visitDate: string;
  notes: string;
  imageUrl?: string;
  cityLocations: CityLocation[];
};

type ApiVisitedPlace = Omit<VisitedPlace, "latitude" | "longitude"> & {
  latitude: number | string;
  longitude: number | string;
  city_locations?: CityLocation[];
};

type TimelineStop = {
  tripId: string;
  id: string;
  cityLocationId?: string;
  cityId: string;
  name: string;
  category: string;
  city: string;
  country: string;
  visitDate: string;
  timeOfVisit?: string;
  notes: string;
  duration?: string;
  photoUrl?: string;
  latitude: number;
  longitude: number;
  isCityFallback: boolean;
  hasExactCoordinates: boolean;
};

type DisplayTimelineStop = TimelineStop & {
  displayLatitude: number;
  displayLongitude: number;
  isApproximateLocation: boolean;
};

type Coordinates = {
  latitude: number;
  longitude: number;
};

function createId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizePlace(place: ApiVisitedPlace): VisitedPlace {
  const rawCityLocations = place.cityLocations || place.city_locations || [];

  return {
    ...place,
    latitude: Number(place.latitude),
    longitude: Number(place.longitude),
    cityLocations: rawCityLocations.map((location) => ({
      id: location.id || createId(),
      name: location.name,
      category: location.category,
      visitDate: location.visitDate || place.visitDate,
      timeOfVisit: location.timeOfVisit,
      duration: location.duration,
      review: location.review,
      photoUrl: location.photoUrl,
      latitude: location.latitude === null || location.latitude === undefined ? undefined : Number(location.latitude),
      longitude: location.longitude === null || location.longitude === undefined ? undefined : Number(location.longitude),
    })),
  };
}

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

function getTime(date: string) {
  const dateValue = date.includes("T") ? new Date(date) : new Date(`${date}T00:00:00`);
  const time = dateValue.getTime();
  return Number.isNaN(time) ? 0 : time;
}

function createTimelineIcon(index: number, isSelected: boolean) {
  return L.divIcon({
    className: `timeline-map-marker ${isSelected ? "selected" : ""}`,
    html: `<span><b>${index}</b></span>`,
    iconSize: [34, 42],
    iconAnchor: [17, 40],
    popupAnchor: [0, -34],
  });
}

function createDisplayStops(
  stops: TimelineStop[],
  resolvedCoordinates: Record<string, Coordinates>
): DisplayTimelineStop[] {
  return stops.map((stop) => {
    const resolvedCoordinate = resolvedCoordinates[stop.id];

    return {
      ...stop,
      displayLatitude: resolvedCoordinate?.latitude ?? stop.latitude,
      displayLongitude: resolvedCoordinate?.longitude ?? stop.longitude,
      isApproximateLocation: !stop.hasExactCoordinates && !resolvedCoordinate,
    };
  });
}

function RouteBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();

  useEffect(() => {
    if (positions.length === 0) {
      return;
    }

    if (positions.length === 1) {
      map.flyTo(positions[0], 7, { duration: 0.8 });
      return;
    }

    map.fitBounds(L.latLngBounds(positions), {
      padding: [48, 48],
      maxZoom: 8,
    });
  }, [map, positions]);

  return null;
}

export function TravelTimeline() {
  const navigate = useNavigate();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTripId, setSelectedTripId] = useState("");
  const [visitedPlaces, setVisitedPlaces] = useState<VisitedPlace[]>([]);
  const [resolvedCoordinates, setResolvedCoordinates] = useState<Record<string, Coordinates>>({});
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const user = useMemo<TimelineUser | null>(() => {
    const storedUser = localStorage.getItem("footprints_user");

    if (!storedUser) {
      return null;
    }

    try {
      return JSON.parse(storedUser) as TimelineUser;
    } catch {
      return null;
    }
  }, []);

  const displayName = user?.name || "Traveler";

  const timelineStops = useMemo<TimelineStop[]>(() => {
    const stops = visitedPlaces.filter(place => !selectedTripId || place.tripId === selectedTripId).flatMap<TimelineStop>((place) => {
      const cityLatitude = Number(place.latitude);
      const cityLongitude = Number(place.longitude);

      if (!Number.isFinite(cityLatitude) || !Number.isFinite(cityLongitude)) {
        return [];
      }

      if (place.cityLocations.length === 0) {
        return [
          {
            id: `city-${place.id}`,
            tripId: place.tripId || place.id,
            cityId: place.id,
            name: place.city,
            category: "City visit",
            city: place.city,
            country: place.country,
            visitDate: place.visitDate,
            notes: place.notes,
            latitude: cityLatitude,
            longitude: cityLongitude,
            isCityFallback: true,
            hasExactCoordinates: true,
          },
        ];
      }

      return place.cityLocations.map((location) => {
        const locationLatitude = Number(location.latitude);
        const locationLongitude = Number(location.longitude);
        const hasLocationCoordinates = Number.isFinite(locationLatitude) && Number.isFinite(locationLongitude);

        return {
          id: `city-location-${location.id}`,
          tripId: place.tripId || place.id,
          cityLocationId: location.id,
          cityId: place.id,
          name: location.name,
          category: location.category,
          city: place.city,
          country: place.country,
          visitDate: location.visitDate || place.visitDate,
          timeOfVisit: location.timeOfVisit,
          notes: location.review,
          duration: location.duration,
          photoUrl: location.photoUrl || place.imageUrl,
          latitude: hasLocationCoordinates ? locationLatitude : cityLatitude,
          longitude: hasLocationCoordinates ? locationLongitude : cityLongitude,
          isCityFallback: false,
          hasExactCoordinates: hasLocationCoordinates,
        };
      });
    });

    return stops.sort((a, b) => {
      const dateDifference = getTime(a.visitDate) - getTime(b.visitDate);

      if (dateDifference !== 0) {
        return dateDifference;
      }

      return (a.timeOfVisit || "").localeCompare(b.timeOfVisit || "");
    });
  }, [visitedPlaces, selectedTripId]);

  const displayTimelineStops = useMemo(
    () => createDisplayStops(timelineStops, resolvedCoordinates),
    [resolvedCoordinates, timelineStops]
  );

  const routePositions = useMemo<[number, number][]>(
    () => displayTimelineStops.map((stop) => [stop.displayLatitude, stop.displayLongitude]),
    [displayTimelineStops]
  );

  const tripRoutes = useMemo(() => {
    const routes = new Map<string, [number, number][]>();
    for (const stop of displayTimelineStops) {
      const positions = routes.get(stop.tripId) || [];
      positions.push([stop.displayLatitude, stop.displayLongitude]);
      routes.set(stop.tripId, positions);
    }
    return [...routes.entries()].filter(([, positions]) => positions.length > 1);
  }, [displayTimelineStops]);

  const selectedStop = useMemo(
    () =>
      displayTimelineStops.find((stop) => stop.id === selectedStopId) ||
      displayTimelineStops[displayTimelineStops.length - 1],
    [displayTimelineStops, selectedStopId]
  );

  const stats = useMemo(() => {
    const countries = new Set(timelineStops.map((stop) => stop.country.trim().toLowerCase()));
    const cities = new Set(timelineStops.map((stop) => `${stop.city.trim().toLowerCase()},${stop.country.trim().toLowerCase()}`));

    return {
      places: timelineStops.length,
      countries: countries.size,
      cityStops: cities.size,
      firstTrip: timelineStops[0] ? formatDate(timelineStops[0].visitDate) : "No trips yet",
    };
  }, [timelineStops]);

  useEffect(() => {
    const stopsNeedingLookup = timelineStops.filter(
      (stop) => !stop.hasExactCoordinates && !stop.isCityFallback && !resolvedCoordinates[stop.id]
    );

    if (stopsNeedingLookup.length === 0) {
      return;
    }

    let isCancelled = false;

    const lookupCoordinates = async () => {
      const nextCoordinates: Record<string, Coordinates> = {};

      for (const stop of stopsNeedingLookup) {
        try {
          const query = encodeURIComponent(`${stop.name}, ${stop.city}, ${stop.country}`);
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${query}`
          );
          const results = (await response.json()) as Array<{ lat: string; lon: string }>;
          const latitude = Number(results[0]?.lat);
          const longitude = Number(results[0]?.lon);

          if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
            nextCoordinates[stop.id] = { latitude, longitude };
          }
        } catch (lookupError) {
          console.error(lookupError);
        }
      }

      if (!isCancelled && Object.keys(nextCoordinates).length > 0) {
        setResolvedCoordinates((currentCoordinates) => ({
          ...currentCoordinates,
          ...nextCoordinates,
        }));
      }
    };

    lookupCoordinates();

    return () => {
      isCancelled = true;
    };
  }, [resolvedCoordinates, timelineStops]);

  useEffect(() => {
    const loadTimeline = async () => {
      const token = localStorage.getItem("footprints_token");

      if (!token) {
        navigate("/");
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        const [response, tripsResponse] = await Promise.all([api.get<{ locations: ApiVisitedPlace[] }>("/api/locations"), api.get<{ trips: Trip[] }>("/api/trips")]);
        setTrips(tripsResponse.data.trips);
        const places = response.data.locations.map(normalizePlace);
        setResolvedCoordinates({});
        setVisitedPlaces(places);
        setSelectedStopId(null);
      } catch (loadError) {
        console.error(loadError);
        setError("Could not load your travel timeline. Try signing in again.");
      } finally {
        setIsLoading(false);
      }
    };

    loadTimeline();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("footprints_token");
    localStorage.removeItem("footprints_user");
    navigate("/");
  };

  return (
    <div className="travel-timeline-page">
      <style>{`
        html,
        body,
        #root {
          width: 100%;
          max-width: none;
          min-height: 100%;
          border: 0;
        }

        .travel-timeline-page {
          min-height: 100svh;
          color: #22312d;
          background: #f5f7f3;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          text-align: left;
        }

        .timeline-nav {
          height: 72px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 0 clamp(20px, 4vw, 56px);
          border-bottom: 1px solid rgba(34, 49, 45, 0.1);
          background: rgba(255, 255, 255, 0.88);
          backdrop-filter: blur(18px);
          position: sticky;
          top: 0;
          z-index: 500;
        }

        .timeline-brand {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          color: #203832;
          font-size: 18px;
          font-weight: 750;
          text-decoration: none;
        }

        .timeline-brand-pin {
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: #2f6f5e;
          box-shadow: 0 10px 22px rgba(47, 111, 94, 0.2);
        }

        .timeline-brand-pin::before {
          content: "";
          width: 12px;
          height: 12px;
          background:
            linear-gradient(#fff, #fff) center / 2px 12px no-repeat,
            linear-gradient(#fff, #fff) center / 12px 2px no-repeat;
          transform: rotate(45deg);
        }

        .timeline-nav-actions,
        .timeline-header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .timeline-user {
          display: grid;
          gap: 2px;
          text-align: right;
        }

        .timeline-user strong {
          color: #1e2c28;
          font-size: 14px;
          line-height: 1.2;
        }

        .timeline-user span {
          color: #66766f;
          font-size: 12px;
          line-height: 1.2;
        }

        .timeline-button {
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

        .timeline-button:hover {
          border-color: rgba(47, 111, 94, 0.35);
          background: #eef6f2;
        }

        .timeline-button.primary {
          border-color: #24332f;
          color: #fff;
          background: #24332f;
        }

        .timeline-button.primary:hover {
          border-color: #2f6f5e;
          background: #2f6f5e;
        }

        .timeline-main {
          display: grid;
          gap: 18px;
          padding: clamp(20px, 3vw, 34px) clamp(20px, 4vw, 56px);
          box-sizing: border-box;
        }

        .timeline-hero {
          display: flex;
          align-items: end;
          justify-content: space-between;
          gap: 24px;
        }

        .timeline-title {
          margin: 0;
          color: #1e2c28;
          font-size: clamp(30px, 4vw, 44px);
          line-height: 1.05;
          font-weight: 750;
          letter-spacing: 0;
        }

        .timeline-copy,
        .timeline-error {
          max-width: 650px;
          margin: 10px 0 0;
          color: #66766f;
          font-size: 16px;
          line-height: 1.55;
        }

        .timeline-error {
          color: #9f3a2f;
        }

        .timeline-stats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
        }

        .timeline-stat,
        .timeline-route-list {
          border: 1px solid rgba(36, 51, 47, 0.1);
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.88);
        }

        .timeline-stat {
          padding: 16px;
        }

        .timeline-stat span {
          color: #6b7b75;
          font-size: 13px;
          font-weight: 700;
        }

        .timeline-stat strong {
          display: block;
          margin-top: 8px;
          color: #1e2c28;
          font-size: clamp(22px, 3vw, 30px);
          line-height: 1.1;
        }

        .timeline-layout {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(320px, 0.36fr);
          gap: 18px;
          align-items: start;
        }

        .timeline-map-shell {
          min-height: 640px;
          overflow: hidden;
          border: 1px solid rgba(36, 51, 47, 0.12);
          border-radius: 8px;
          background: #e7efe9;
          box-shadow: 0 18px 45px rgba(36, 51, 47, 0.1);
        }

        .timeline-map,
        .leaflet-container {
          width: 100%;
          height: 100%;
          min-height: 640px;
          font: inherit;
        }

        .timeline-map-marker {
          display: grid;
          place-items: center;
          background: transparent;
        }

        .timeline-map-marker span {
          width: 30px;
          height: 30px;
          display: grid;
          place-items: center;
          border: 3px solid #fff;
          border-radius: 50% 50% 50% 0;
          color: #fff;
          background: #dc2626;
          box-shadow: 0 10px 18px rgba(25, 36, 33, 0.25);
          font-size: 12px;
          font-weight: 800;
          line-height: 1;
          transform: rotate(-45deg);
        }

        .timeline-map-marker b {
          transform: rotate(45deg);
        }

        .timeline-map-marker b {
          display: block;
          font: inherit;
        }

        .timeline-map-marker.selected span {
          background: #2f6f5e;
          box-shadow: 0 0 0 6px rgba(47, 111, 94, 0.18), 0 12px 22px rgba(25, 36, 33, 0.28);
        }

        .timeline-popup-title {
          margin: 0 0 4px;
          color: #1e2c28;
          font-size: 15px;
          font-weight: 750;
        }

        .timeline-popup-meta,
        .timeline-popup-notes {
          margin: 0;
          color: #52645f;
          font-size: 13px;
          line-height: 1.35;
        }

        .timeline-popup-image {
          width: 180px;
          height: 100px;
          object-fit: cover;
          border-radius: 6px;
          margin-top: 8px;
        }

        .timeline-route-list {
          max-height: 640px;
          overflow: hidden;
          display: grid;
          grid-template-rows: auto minmax(0, 1fr);
        }

        .timeline-route-header {
          padding: 18px 18px 12px;
          border-bottom: 1px solid rgba(36, 51, 47, 0.08);
        }

        .timeline-route-header h2 {
          margin: 0;
          color: #1e2c28;
          font-size: 20px;
          line-height: 1.2;
          font-weight: 750;
        }

        .timeline-route-header p {
          margin: 6px 0 0;
          color: #66766f;
          font-size: 14px;
          line-height: 1.45;
        }

        .timeline-route-items {
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

        .timeline-stop {
          position: relative;
          display: grid;
          gap: 8px;
          border: 1px solid transparent;
          border-radius: 8px;
          padding: 12px 12px 12px 48px;
          background: transparent;
          cursor: pointer;
        }

        .timeline-stop::before {
          content: "";
          position: absolute;
          left: 24px;
          top: 42px;
          bottom: -14px;
          width: 2px;
          background: rgba(47, 111, 94, 0.22);
        }

        .timeline-stop:last-child::before {
          display: none;
        }

        .timeline-stop:hover,
        .timeline-stop.active {
          border-color: rgba(47, 111, 94, 0.18);
          background: #eef6f2;
        }

        .timeline-stop-number {
          position: absolute;
          left: 10px;
          top: 12px;
          width: 28px;
          height: 28px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          color: #fff;
          background: #2f6f5e;
          font-size: 12px;
          font-weight: 800;
        }

        .timeline-stop strong {
          color: #1e2c28;
          font-size: 15px;
          line-height: 1.25;
        }

        .timeline-stop-date,
        .timeline-stop-count {
          color: #6b7b75;
          font-size: 13px;
          font-weight: 700;
          line-height: 1.3;
        }

        .timeline-stop-notes {
          margin: 0;
          color: #52645f;
          font-size: 13px;
          line-height: 1.45;
        }

        .timeline-stop-locations {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin: 0;
          padding: 0;
          list-style: none;
        }

        .timeline-stop-locations li {
          border: 1px solid rgba(47, 111, 94, 0.16);
          border-radius: 999px;
          padding: 4px 8px;
          color: #52645f;
          background: #fff;
          font-size: 12px;
          line-height: 1.2;
        }

        @media (max-width: 980px) {
          .timeline-stats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .timeline-layout {
            grid-template-columns: 1fr;
          }

          .timeline-route-list {
            max-height: none;
          }
        }

        @media (max-width: 760px) {
          .timeline-nav {
            height: auto;
            align-items: flex-start;
            flex-direction: column;
            padding-block: 16px;
          }

          .timeline-nav-actions {
            width: 100%;
            justify-content: space-between;
          }

          .timeline-user {
            text-align: left;
          }

          .timeline-hero {
            align-items: flex-start;
            flex-direction: column;
            gap: 14px;
          }

          .timeline-header-actions {
            width: 100%;
          }

          .timeline-header-actions .timeline-button {
            flex: 1;
          }

          .timeline-stats {
            grid-template-columns: 1fr;
          }

          .timeline-map-shell,
          .timeline-map,
          .leaflet-container {
            min-height: 460px;
          }
        }
      `}</style>

      <nav className="timeline-nav" aria-label="Timeline navigation">
        <a className="timeline-brand" href="/dashboard">
          <span className="timeline-brand-pin" />
          Footprints
        </a>

        <div className="timeline-nav-actions">
          <div className="timeline-user">
            <strong>{displayName}</strong>
            <span>{user?.email || "Your travel timeline"}</span>
          </div>
          <button className="timeline-button" type="button" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </nav>

      <main className="timeline-main">
        <section className="timeline-hero">
          <div>
            <h1 className="timeline-title">Travel timeline</h1>
            <p className="timeline-copy">
              Follow each trip in visit order, across countries and cities. Select a trip to explore its route.
            </p>
            {error && <p className="timeline-error">{error}</p>}
          </div>

          <div className="timeline-header-actions">
            <button className="timeline-button" type="button" onClick={() => navigate("/dashboard")}>
              Dashboard
            </button>
            <button className="timeline-button primary" type="button" onClick={() => navigate("/dashboard")}>
              Add place
            </button>
          </div>
        </section>

        <TripManager trips={trips} selectedId={selectedTripId} onSelect={id => { setSelectedTripId(id); setSelectedStopId(null); }} />

        <section className="timeline-stats" aria-label="Timeline stats">
          <div className="timeline-stat">
            <span>Visited locations</span>
            <strong>{stats.places}</strong>
          </div>
          <div className="timeline-stat">
            <span>Countries connected</span>
            <strong>{stats.countries}</strong>
          </div>
          <div className="timeline-stat">
            <span>Cities represented</span>
            <strong>{stats.cityStops}</strong>
          </div>
          <div className="timeline-stat">
            <span>First trip</span>
            <strong>{stats.firstTrip}</strong>
          </div>
        </section>

        <section className="timeline-layout">
          <div className="timeline-map-shell" aria-label="Connected travel timeline map">
            <MapContainer
              className="timeline-map"
              center={selectedStop ? [selectedStop.displayLatitude, selectedStop.displayLongitude] : [20, 0]}
              zoom={selectedStop ? 5 : 2}
              minZoom={2}
              scrollWheelZoom
            >
              <RouteBounds positions={routePositions} />
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {tripRoutes.map(([tripId, positions]) => (
                <Polyline
                  key={tripId}
                  positions={positions}
                  pathOptions={{
                    color: "#2f6f5e",
                    dashArray: "10 12",
                    lineCap: "round",
                    lineJoin: "round",
                    opacity: 0.86,
                    weight: 4,
                  }}
                />
              ))}

              {displayTimelineStops.map((stop, index) => (
                <Marker
                  key={stop.id}
                  position={[stop.displayLatitude, stop.displayLongitude]}
                  icon={createTimelineIcon(index + 1, selectedStopId === stop.id)}
                  eventHandlers={{ click: () => setSelectedStopId(stop.id) }}
                >
                  <Popup>
                    <h3 className="timeline-popup-title">
                      {stop.name}
                    </h3>
                    <p className="timeline-popup-meta">
                      Stop {index + 1} - {stop.city}, {stop.country} - {formatDate(stop.visitDate)}
                      {stop.timeOfVisit ? ` at ${stop.timeOfVisit}` : ""}
                    </p>
                    <p className="timeline-popup-notes">{stop.notes}</p>
                    {stop.isApproximateLocation && (
                      <p className="timeline-popup-notes">Exact coordinates not found; showing the city position.</p>
                    )}
                    {stop.photoUrl && (
                      <img className="timeline-popup-image" src={stop.photoUrl} alt={`${stop.name} memory`} />
                    )}
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>

          <aside className="timeline-route-list" aria-label="Timeline route stops">
            <div className="timeline-route-header">
              <h2>Route order</h2>
              <p>Select a stop to highlight it on the map.</p>
            </div>

            <div className="timeline-route-items">
              {isLoading ? (
                <p className="timeline-empty">Loading your travel timeline...</p>
              ) : timelineStops.length === 0 ? (
                <p className="timeline-empty">No visited locations to connect yet. Add city locations from your dashboard.</p>
              ) : (
                timelineStops.map((stop, index) => (
                  <article
                    className={`timeline-stop ${selectedStopId === stop.id ? "active" : ""}`}
                    key={stop.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedStopId(stop.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        setSelectedStopId(stop.id);
                      }
                    }}
                  >
                    <span className="timeline-stop-number">{index + 1}</span>
                    <strong>{stop.name}</strong>
                    <span className="timeline-stop-date">
                      {formatDate(stop.visitDate)}
                      {stop.timeOfVisit ? ` at ${stop.timeOfVisit}` : ""}
                    </span>
                    <span className="timeline-stop-count">
                      {stop.city}, {stop.country} - {stop.category}
                    </span>
                    <p className="timeline-stop-notes">{stop.notes}</p>
                    <span className="timeline-stop-count">
                      {stop.isCityFallback
                        ? "City-level visit"
                        : stop.duration
                          ? `Duration: ${stop.duration}`
                          : "Location visit"}
                    </span>
                  </article>
                ))
              )}
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}

export default TravelTimeline;
