import { useState } from "react";
import { apiError, tripLabel, type Trip } from "../services/trips";
import api from "../services/api";
import "./trips.css";

type Props = {
  trips: Trip[];
  selectedId: string;
  onSelect: (id: string) => void;
  onSaved?: (trip: Trip) => void;
};

export default function TripManager({ trips, selectedId, onSelect, onSaved }: Props) {
  const [draft, setDraft] = useState<Omit<Trip, "id"> | null>(null);
  const [editingId, setEditingId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const selected = trips.find(trip => trip.id === selectedId);

  const open = (trip?: Trip) => {
    setEditingId(trip?.id || "");
    setDraft(trip ? { name: trip.name, startDate: trip.startDate, endDate: trip.endDate } : { name: "", startDate: "", endDate: "" });
    setError("");
  };

  return <section className="trip-panel" aria-label="Trips">
    <div className="trip-toolbar">
      <label htmlFor="trip-filter">Trip</label>
      <select id="trip-filter" value={selectedId} onChange={event => onSelect(event.target.value)}>
        <option value="">All trips</option>
        {trips.map(trip => <option key={trip.id} value={trip.id}>{tripLabel(trip)}</option>)}
      </select>
      {onSaved && <>
        <button type="button" onClick={() => open()}>Create trip</button>
        {selected && <button type="button" onClick={() => open(selected)}>Edit trip</button>}
      </>}
    </div>
    {!trips.length && onSaved && <p>Create a named trip, then add the cities and places you visited.</p>}
    {draft && <form className="trip-form" onSubmit={async event => {
      event.preventDefault();
      setSaving(true);
      setError("");
      try {
        const response = editingId
          ? await api.put<{ trip: Trip }>(`/api/trips/${editingId}`, draft)
          : await api.post<{ trip: Trip }>("/api/trips", draft);
        onSaved?.(response.data.trip);
        setDraft(null);
      } catch (saveError) { setError(apiError(saveError, "Could not save trip. Please try again.")); }
      finally { setSaving(false); }
    }}>
      <h2>{editingId ? "Edit trip" : "Create a trip"}</h2>
      <label htmlFor="trip-name">Trip name</label>
      <input id="trip-name" autoFocus required maxLength={160} placeholder="Japan Spring 2026" value={draft.name}
        onChange={event => setDraft({ ...draft, name: event.target.value })} />
      <label htmlFor="trip-start">Start date</label>
      <input id="trip-start" type="date" required value={draft.startDate}
        onChange={event => setDraft({ ...draft, startDate: event.target.value })} />
      <label htmlFor="trip-end">End date</label>
      <input id="trip-end" type="date" required min={draft.startDate} value={draft.endDate}
        onChange={event => setDraft({ ...draft, endDate: event.target.value })} />
      {error && <p role="alert">{error}</p>}
      <div className="trip-toolbar">
        <button type="submit" disabled={saving}>{saving ? "Saving…" : "Save trip"}</button>
        <button type="button" disabled={saving} onClick={() => setDraft(null)}>Cancel</button>
      </div>
    </form>}
  </section>;
}
