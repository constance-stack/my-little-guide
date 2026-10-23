"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { InteractiveMap, type PersonalPinData, type PlaceFeatureCollection } from "./interactive-map";
import { PlaceSheet } from "./place-sheet";

type OwnedDestination = { id: string; slug: string; name: string };

export function MapPageClient({
  initialDestinationSlug,
  initialPlaceSlug,
  initialCategorySlug,
  demo = false,
}: {
  initialDestinationSlug: string | null;
  initialPlaceSlug: string | null;
  initialCategorySlug: string | null;
  demo?: boolean;
}) {
  const router = useRouter();
  const [destinations, setDestinations] = useState<OwnedDestination[]>([]);
  const [destinationSlug, setDestinationSlug] = useState<string | null>(initialDestinationSlug);
  const [data, setData] = useState<PlaceFeatureCollection>({ type: "FeatureCollection", features: [] });
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [selectedPlaceSlug, setSelectedPlaceSlug] = useState<string | null>(initialPlaceSlug);
  const [centerOn, setCenterOn] = useState<[number, number] | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(initialCategorySlug);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  // Personal pins: the visitor's own points on this destination's map
  // (hotel, meeting spot…) — not part of the editorial content, not
  // available in demo mode (requires an account and that destination).
  const [personalPins, setPersonalPins] = useState<PersonalPinData[]>([]);
  const [placingPin, setPlacingPin] = useState(false);
  const [pendingPin, setPendingPin] = useState<{ lng: number; lat: number } | null>(null);
  const [pendingLabel, setPendingLabel] = useState("");
  const [selectedPersonalPinId, setSelectedPersonalPinId] = useState<string | null>(null);

  // Owned destinations, for the selector. Skipped in demo mode: there's
  // nothing "owned" to pick from, just the one fixed free place list.
  useEffect(() => {
    if (demo) return;
    fetch("/api/catalog")
      .then((r) => r.json())
      .then((payload: { destinations: (OwnedDestination & { owned: boolean })[] }) => {
        const owned = payload.destinations.filter((d) => d.owned);
        setDestinations(owned);
        if (!destinationSlug && owned[0]) setDestinationSlug(owned[0].slug);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo]);

  // Favorites, for the "mes favoris" filter — not available to anonymous
  // demo visitors.
  useEffect(() => {
    if (demo) return;
    fetch("/api/favorites")
      .then((r) => r.json())
      .then((payload: { favorites: { placeId: string }[] }) => setFavoriteIds(new Set(payload.favorites.map((f) => f.placeId))));
  }, [demo]);

  // Personal pins for the current destination — not available in demo mode.
  useEffect(() => {
    if (demo || !destinationSlug) {
      queueMicrotask(() => setPersonalPins([]));
      return;
    }
    fetch(`/api/personal-pins?destination=${destinationSlug}`)
      .then((r) => r.json())
      .then((payload: { pins: PersonalPinData[] }) => setPersonalPins(payload.pins ?? []));
  }, [demo, destinationSlug]);

  function handleMapClickForPin(lng: number, lat: number) {
    setPlacingPin(false);
    setPendingPin({ lng, lat });
    setPendingLabel("");
  }

  async function submitPendingPin() {
    if (!pendingPin || !destinationSlug || !pendingLabel.trim()) return;
    const res = await fetch("/api/personal-pins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ destinationSlug, label: pendingLabel.trim(), lat: pendingPin.lat, lng: pendingPin.lng }),
    });
    if (res.ok) {
      const pin: PersonalPinData = await res.json();
      setPersonalPins((prev) => [...prev, pin]);
    }
    setPendingPin(null);
    setPendingLabel("");
  }

  async function deletePersonalPin(id: string) {
    setSelectedPersonalPinId(null);
    setPersonalPins((prev) => prev.filter((p) => p.id !== id));
    await fetch(`/api/personal-pins/${id}`, { method: "DELETE" });
  }

  // Place data: the fixed free-preview list in demo mode, otherwise the
  // selected owned destination.
  useEffect(() => {
    if (demo) {
      fetch(`/api/places?demo=1`)
        .then((r) => r.json())
        .then((fc: PlaceFeatureCollection) => setData(fc));
      return;
    }
    if (!destinationSlug) return;
    fetch(`/api/places?destination=${destinationSlug}`)
      .then((r) => r.json())
      .then((fc: PlaceFeatureCollection) => setData(fc));
  }, [demo, destinationSlug]);

  // Resolve an initial place slug (from a deep-link) to its id + coordinates
  // once the data for that destination has loaded.
  useEffect(() => {
    if (!selectedPlaceSlug) return;
    const feature = data.features.find((f) => f.properties.slug === selectedPlaceSlug);
    if (feature) {
      setSelectedPlaceId(feature.properties.id);
      setCenterOn(feature.geometry.coordinates as [number, number]);
    }
  }, [selectedPlaceSlug, data]);

  const allCategories = useMemo(() => {
    const map = new Map<string, { slug: string; name: string; color: string }>();
    for (const f of data.features) {
      for (const c of f.properties.categories) map.set(c.slug, c);
    }
    return Array.from(map.values());
  }, [data]);

  const filtered = useMemo<PlaceFeatureCollection>(() => {
    return {
      type: "FeatureCollection",
      features: data.features.filter((f) => {
        if (categoryFilter && !f.properties.categories.some((c) => c.slug === categoryFilter)) return false;
        if (favoritesOnly && !favoriteIds.has(f.properties.id)) return false;
        if (search.trim()) {
          const haystack = `${f.properties.name} ${f.properties.zone ?? ""}`.toLowerCase();
          if (!haystack.includes(search.toLowerCase())) return false;
        }
        return true;
      }),
    };
  }, [data, categoryFilter, favoritesOnly, favoriteIds, search]);

  const updateUrl = useCallback(
    (next: { destination?: string | null; place?: string | null; cat?: string | null }) => {
      const params = new URLSearchParams();
      const dest = next.destination !== undefined ? next.destination : destinationSlug;
      const place = next.place !== undefined ? next.place : selectedPlaceSlug;
      const cat = next.cat !== undefined ? next.cat : categoryFilter;
      if (!demo && dest) params.set("destination", dest);
      if (place) params.set("place", place);
      if (cat) params.set("cat", cat);
      router.replace(`${demo ? "/carte/demo" : "/carte"}?${params.toString()}`, { scroll: false });
    },
    [demo, destinationSlug, selectedPlaceSlug, categoryFilter, router]
  );

  function handleSelectPlace(placeId: string) {
    const feature = data.features.find((f) => f.properties.id === placeId);
    setSelectedPlaceId(placeId);
    setSelectedPlaceSlug(feature?.properties.slug ?? null);
    updateUrl({ place: feature?.properties.slug ?? null });
  }

  function handleSelectFromList(feature: PlaceFeatureCollection["features"][number]) {
    setSelectedPlaceId(feature.properties.id);
    setSelectedPlaceSlug(feature.properties.slug);
    setCenterOn(feature.geometry.coordinates as [number, number]);
    updateUrl({ place: feature.properties.slug });
  }

  function handleGeolocate() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      setCenterOn([pos.coords.longitude, pos.coords.latitude]);
    });
  }

  return (
    <div className="flex h-[calc(100vh-65px)] min-h-0 flex-col sm:flex-row">
      <aside className="order-2 max-h-[45vh] w-full shrink overflow-y-auto border-t border-line bg-ivory p-4 sm:order-1 sm:max-h-none sm:w-80 sm:shrink-0 sm:border-r sm:border-t-0">
        {destinations.length > 1 && (
          <select
            value={destinationSlug ?? ""}
            onChange={(e) => {
              setDestinationSlug(e.target.value);
              updateUrl({ destination: e.target.value, place: null });
            }}
            className="mb-3 w-full rounded border border-line bg-ivory px-2 py-1.5 text-sm"
          >
            {destinations.map((d) => (
              <option key={d.id} value={d.slug}>
                {d.name}
              </option>
            ))}
          </select>
        )}

        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un lieu, un quartier…"
          className="mb-3 w-full rounded border border-line bg-ivory px-3 py-2 text-sm outline-none focus:border-sage-dark"
        />

        <div className="mb-3 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setCategoryFilter(null)}
            className={`rounded-full px-2.5 py-1 text-xs ${!categoryFilter ? "bg-sage-dark text-ivory" : "border border-line text-foreground/60"}`}
          >
            Toutes
          </button>
          {allCategories.map((c) => (
            <button
              key={c.slug}
              type="button"
              onClick={() => setCategoryFilter(categoryFilter === c.slug ? null : c.slug)}
              className={`rounded-full px-2.5 py-1 text-xs ${categoryFilter === c.slug ? "text-ivory" : "border border-line text-foreground/60"}`}
              style={categoryFilter === c.slug ? { backgroundColor: c.color } : undefined}
            >
              {c.name}
            </button>
          ))}
        </div>

        <div className="mb-4 flex items-center justify-between">
          {!demo && (
            <label className="flex items-center gap-2 text-sm text-foreground/70">
              <input type="checkbox" checked={favoritesOnly} onChange={(e) => setFavoritesOnly(e.target.checked)} />
              Mes favoris uniquement
            </label>
          )}
          <button type="button" onClick={handleGeolocate} className="text-xs text-sage-dark underline">
            Me localiser
          </button>
        </div>

        {demo && (
          <p className="mb-4 rounded border border-sage bg-sand p-3 text-xs text-foreground/70">
            Aperçu gratuit — {data.features.length} lieux de Bangkok. Le guide complet en compte bien plus, avec
            toutes les catégories, vos favoris et votre PDF personnalisé.
          </p>
        )}

        {!demo && (
          <div className="mb-4">
            {placingPin ? (
              <div className="rounded border border-sage-dark bg-sand p-3 text-xs text-foreground/70">
                Cliquez sur la carte pour placer votre point (hôtel, rendez-vous…).
                <button type="button" onClick={() => setPlacingPin(false)} className="ml-2 text-sage-dark underline">
                  Annuler
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setPlacingPin(true)}
                className="w-full rounded border border-line px-3 py-2 text-left text-xs text-foreground/70 hover:border-sage-dark"
              >
                📍 Ajouter une adresse perso (hôtel, rendez-vous…)
              </button>
            )}

            {personalPins.length > 0 && (
              <ul className="mt-2 space-y-1">
                {personalPins.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedPersonalPinId(p.id)}
                      className="flex w-full items-center gap-1.5 px-1 py-1 text-left text-xs text-foreground/70 hover:text-sage-dark"
                    >
                      📍 {p.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <ul className="divide-y divide-line">
          {filtered.features.map((f) => (
            <li key={f.properties.id}>
              <button
                type="button"
                onClick={() => handleSelectFromList(f)}
                className={`block w-full px-1 py-2 text-left text-sm hover:text-sage-dark ${
                  selectedPlaceId === f.properties.id ? "text-sage-dark" : ""
                }`}
              >
                {f.properties.name}
                <span className="block text-xs text-foreground/50">{f.properties.zone}</span>
              </button>
            </li>
          ))}
          {filtered.features.length === 0 && <li className="py-4 text-sm text-foreground/50">Aucun résultat.</li>}
        </ul>
      </aside>

      <div className="relative order-1 min-h-[220px] flex-1 sm:order-2">
        <InteractiveMap
          data={filtered}
          selectedPlaceId={selectedPlaceId}
          onSelectPlace={handleSelectPlace}
          centerOn={centerOn}
          personalPins={personalPins}
          placingPin={placingPin}
          onMapClickForPin={handleMapClickForPin}
          onSelectPersonalPin={setSelectedPersonalPinId}
          clusterEnabled={!demo}
        />
        {selectedPlaceSlug && (
          <PlaceSheet
            slug={selectedPlaceSlug}
            demo={demo}
            onClose={() => {
              setSelectedPlaceId(null);
              setSelectedPlaceSlug(null);
              updateUrl({ place: null });
            }}
          />
        )}

        {pendingPin && (
          <div className="absolute bottom-4 left-4 right-4 z-10 rounded-lg border border-line bg-ivory p-4 shadow-lg sm:right-auto sm:w-80">
            <p className="mb-2 text-sm font-medium text-foreground">Nommer ce point</p>
            <input
              type="text"
              autoFocus
              value={pendingLabel}
              onChange={(e) => setPendingLabel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitPendingPin()}
              placeholder="Ex. Mon hôtel, Rendez-vous avec Léa…"
              className="mb-3 w-full rounded border border-line bg-ivory px-3 py-2 text-sm outline-none focus:border-sage-dark"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={submitPendingPin}
                disabled={!pendingLabel.trim()}
                className="rounded bg-sage-dark px-3 py-1.5 text-xs text-ivory hover:opacity-90 disabled:opacity-50"
              >
                Enregistrer
              </button>
              <button
                type="button"
                onClick={() => {
                  setPendingPin(null);
                  setPendingLabel("");
                }}
                className="rounded border border-line px-3 py-1.5 text-xs text-foreground/70"
              >
                Annuler
              </button>
            </div>
          </div>
        )}

        {selectedPersonalPinId && (
          <div className="absolute bottom-4 left-4 right-4 z-10 rounded-lg border border-line bg-ivory p-4 shadow-lg sm:right-auto sm:w-80">
            <button
              type="button"
              onClick={() => setSelectedPersonalPinId(null)}
              className="absolute right-3 top-3 text-foreground/40 hover:text-foreground"
            >
              ✕
            </button>
            <p className="mb-1 text-xs uppercase tracking-wide text-sage-dark">Votre point</p>
            <p className="mb-3 font-serif text-lg text-foreground">
              {personalPins.find((p) => p.id === selectedPersonalPinId)?.label}
            </p>
            <button
              type="button"
              onClick={() => deletePersonalPin(selectedPersonalPinId)}
              className="rounded border border-line px-3 py-1.5 text-xs text-foreground/70 hover:border-sage-dark"
            >
              Supprimer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
