"use client";

import { useEffect, useState } from "react";

type Place = { id: string; slug: string; name: string; lat: number; lng: number };
type Stop = { id: string; place: Place };
type Day = { id: string; label: string; stops: Stop[] };
type FavoritePlace = { placeId: string; slug: string; name: string };

export function ItineraireClient() {
  const [days, setDays] = useState<Day[]>([]);
  const [favorites, setFavorites] = useState<FavoritePlace[]>([]);
  const [travelTimes, setTravelTimes] = useState<Record<string, { toStopId: string; minutes: number | null }[]>>({});
  const [loading, setLoading] = useState(true);

  async function loadDays() {
    const res = await fetch("/api/trip-days");
    const data = await res.json();
    setDays(data.days ?? []);
  }

  useEffect(() => {
    Promise.all([
      loadDays(),
      fetch("/api/favorites")
        .then((r) => r.json())
        .then((d) => setFavorites(d.favorites ?? [])),
    ]).finally(() => setLoading(false));
  }, []);

  // Refetch whenever the actual stop composition changes (count, order, or
  // which days exist) — depending on days.length alone missed the case
  // where a stop is added to/removed from an already-existing day.
  const stopsSignature = days.map((d) => `${d.id}:${d.stops.map((s) => s.id).join(",")}`).join("|");

  useEffect(() => {
    days.forEach((day) => {
      if (day.stops.length < 2) return;
      fetch(`/api/trip-days/${day.id}/travel-times`)
        .then((r) => r.json())
        .then((d) => setTravelTimes((prev) => ({ ...prev, [day.id]: d.legs ?? [] })));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopsSignature]);

  async function addDay() {
    await fetch("/api/trip-days", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: `Jour ${days.length + 1}` }),
    });
    loadDays();
  }

  async function deleteDay(dayId: string) {
    await fetch(`/api/trip-days/${dayId}`, { method: "DELETE" });
    loadDays();
  }

  async function addStop(dayId: string, placeId: string) {
    if (!placeId) return;
    await fetch(`/api/trip-days/${dayId}/stops`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ placeId }),
    });
    loadDays();
  }

  async function removeStop(dayId: string, stopId: string) {
    await fetch(`/api/trip-days/${dayId}/stops/${stopId}`, { method: "DELETE" });
    loadDays();
  }

  async function reorder(day: Day, fromIndex: number, toIndex: number) {
    const stops = [...day.stops];
    const [moved] = stops.splice(fromIndex, 1);
    stops.splice(toIndex, 0, moved);
    setDays((prev) => prev.map((d) => (d.id === day.id ? { ...d, stops } : d)));
    await fetch(`/api/trip-days/${day.id}/stops`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stopIds: stops.map((s) => s.id) }),
    });
  }

  function directionsUrl(day: Day) {
    if (day.stops.length === 0) return null;
    const waypoints = day.stops.map((s) => `${s.place.lat},${s.place.lng}`);
    const destination = waypoints[waypoints.length - 1];
    const origin = waypoints[0];
    const mid = waypoints.slice(1, -1).join("|");
    const params = new URLSearchParams({ api: "1", origin, destination });
    if (mid) params.set("waypoints", mid);
    return `https://www.google.com/maps/dir/?${params.toString()}`;
  }

  if (loading) return <p className="text-sm text-foreground/60">Chargement…</p>;

  return (
    <div className="space-y-8">
      {days.map((day) => {
        const legs = travelTimes[day.id] ?? [];
        const url = directionsUrl(day);
        return (
          <div key={day.id} className="rounded border border-line bg-ivory p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-serif text-lg text-sage-dark">{day.label}</h2>
              <button type="button" onClick={() => deleteDay(day.id)} className="text-xs text-foreground/40 underline">
                Supprimer ce jour
              </button>
            </div>

            <ol className="mb-3 space-y-2">
              {day.stops.map((stop, i) => (
                <li key={stop.id}>
                  <div className="flex items-center justify-between rounded border border-line bg-sand px-3 py-2 text-sm">
                    <span>
                      {i + 1}. {stop.place.name}
                    </span>
                    <div className="flex items-center gap-2 text-xs">
                      {i > 0 && (
                        <button type="button" onClick={() => reorder(day, i, i - 1)} className="text-foreground/50">
                          ↑
                        </button>
                      )}
                      {i < day.stops.length - 1 && (
                        <button type="button" onClick={() => reorder(day, i, i + 1)} className="text-foreground/50">
                          ↓
                        </button>
                      )}
                      <button type="button" onClick={() => removeStop(day.id, stop.id)} className="text-red-700/70">
                        retirer
                      </button>
                    </div>
                  </div>
                  {i < day.stops.length - 1 && (
                    <p className="py-1 text-center text-xs text-foreground/40">
                      {(() => {
                        const leg = legs.find((l) => l.toStopId === day.stops[i + 1].id);
                        if (!leg) return "…";
                        return leg.minutes !== null ? `↓ ${leg.minutes} min à pied` : "↓";
                      })()}
                    </p>
                  )}
                </li>
              ))}
            </ol>

            {favorites.length > 0 && (
              <select
                defaultValue=""
                onChange={(e) => {
                  addStop(day.id, e.target.value);
                  e.target.value = "";
                }}
                className="mb-3 w-full rounded border border-line bg-ivory px-2 py-1.5 text-sm"
              >
                <option value="" disabled>
                  Ajouter un favori à ce jour…
                </option>
                {favorites.map((f) => (
                  <option key={f.placeId} value={f.placeId}>
                    {f.name}
                  </option>
                ))}
              </select>
            )}

            {url && (
              <a href={url} target="_blank" rel="noreferrer" className="text-sm text-sage-dark underline">
                Ouvrir l&apos;itinéraire du jour dans Google Maps
              </a>
            )}
          </div>
        );
      })}

      <button type="button" onClick={addDay} className="rounded bg-sage-dark px-4 py-2 text-sm text-ivory hover:opacity-90">
        + Ajouter une journée
      </button>

      {favorites.length === 0 && (
        <p className="text-sm text-foreground/50">
          Ajoutez des favoris depuis le guide ou la carte pour pouvoir composer vos journées.
        </p>
      )}
    </div>
  );
}
