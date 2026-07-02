/* eslint-disable @typescript-eslint/no-explicit-any --
 * Leaflet is a runtime global (`window.L`) loaded from a CDN, with no bundled
 * types in this project. The handful of `any`s below are confined to this file's
 * interaction with that untyped global; everything crossing into the rest of the
 * app (props, Marker) is fully typed.
 */
import { useEffect, useRef, useState } from "react";
import type { Marker } from "@/lib/cms/types";
import { cn } from "@/lib/utils";

// Leaflet is loaded from a CDN at runtime (client only) — no build dependency,
// no API key, OpenStreetMap tiles. We use HTML DivIcons for markers so there is
// no broken default-icon image-path problem with the CDN build.

const LEAFLET_VERSION = "1.9.4";
const CSS_URL = `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.css`;
const JS_URL = `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.js`;

let leafletPromise: Promise<any> | null = null;

function loadLeaflet(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("SSR"));
  const w = window as any;
  if (w.L) return Promise.resolve(w.L);
  if (leafletPromise) return leafletPromise;

  leafletPromise = new Promise((resolve, reject) => {
    if (!document.querySelector(`link[data-leaflet]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = CSS_URL;
      link.setAttribute("data-leaflet", "");
      document.head.appendChild(link);
    }
    const existing = document.querySelector<HTMLScriptElement>(`script[data-leaflet]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(w.L));
      existing.addEventListener("error", () => reject(new Error("Leaflet failed to load")));
      return;
    }
    const script = document.createElement("script");
    script.src = JS_URL;
    script.async = true;
    script.setAttribute("data-leaflet", "");
    script.onload = () => resolve(w.L);
    script.onerror = () => reject(new Error("Leaflet failed to load"));
    document.head.appendChild(script);
  });
  return leafletPromise;
}

const KIND_COLOR: Record<Marker["kind"], string> = {
  residence: "#C9883B",
  beach: "#3B9BC9",
  school: "#7A57C9",
  shop: "#C9573B",
  transport: "#4B8A4B",
  other: "#8A8073",
};

function pinIcon(L: any, color: string, active: boolean) {
  const size = active ? 38 : 30;
  return L.divIcon({
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
    html: `<div style="transform:translateZ(0)">
      <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"
        style="filter:drop-shadow(0 3px 4px rgba(28,24,19,.35))">
        <path d="M12 22s7-7.16 7-12a7 7 0 1 0-14 0c0 4.84 7 12 7 12Z"
          fill="${color}" stroke="#1C1813" stroke-width="${active ? 1.4 : 1}"/>
        <circle cx="12" cy="10" r="2.6" fill="#fff"/>
      </svg></div>`,
  });
}

export type LeafletMapProps = {
  center: { lat: number; lng: number };
  zoom: number;
  markers: Marker[];
  className?: string;
  editable?: boolean;
  selectedId?: string | null;
  onMapClick?: (lat: number, lng: number) => void;
  onMarkerMove?: (id: string, lat: number, lng: number) => void;
  onSelect?: (id: string) => void;
  /** Notifies parent of the current center/zoom (admin uses this to save view). */
  onViewChange?: (center: { lat: number; lng: number }, zoom: number) => void;
};

export function LeafletMap({
  center,
  zoom,
  markers,
  className,
  editable = false,
  selectedId = null,
  onMapClick,
  onMarkerMove,
  onSelect,
  onViewChange,
}: LeafletMapProps) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const layerRef = useRef<any>(null);
  const LRef = useRef<any>(null);
  const roRef = useRef<ResizeObserver | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  // Keep latest callbacks without re-initialising the map.
  const cbs = useRef({ onMapClick, onViewChange });
  cbs.current = { onMapClick, onViewChange };

  // Initialise once.
  useEffect(() => {
    let cancelled = false;
    loadLeaflet()
      .then((L) => {
        if (cancelled || !elRef.current || mapRef.current) return;
        LRef.current = L;
        const map = L.map(elRef.current, {
          scrollWheelZoom: editable,
          attributionControl: true,
          zoomControl: editable,
        });
        map.setView([center.lat, center.lng], zoom);
        // CARTO "Positron" — a clean, minimal light basemap (free, no API key).
        // Far more elegant than the busy default OSM tiles for a luxury brand.
        L.tileLayer(`https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png`, {
          maxZoom: 20,
          subdomains: "abcd",
          detectRetina: true,
          attribution: "&copy; OpenStreetMap &copy; CARTO",
        }).addTo(map);
        layerRef.current = L.layerGroup().addTo(map);
        mapRef.current = map;

        if (editable) {
          map.on("click", (e: any) => cbs.current.onMapClick?.(e.latlng.lat, e.latlng.lng));
          map.on("moveend zoomend", () => {
            const c = map.getCenter();
            cbs.current.onViewChange?.({ lat: c.lat, lng: c.lng }, map.getZoom());
          });
        }
        setStatus("ready");

        // The container is often sized late (reveal/clip animations, aspect-ratio
        // layout, fonts). A ResizeObserver keeps Leaflet's internal size in sync so
        // tiles always paint instead of staying blank/grey. It also fires once on
        // observe, covering the common 0-height-at-init case.
        if (typeof ResizeObserver !== "undefined" && elRef.current) {
          const ro = new ResizeObserver(() => map.invalidateSize());
          ro.observe(elRef.current);
          roRef.current = ro;
        } else {
          setTimeout(() => map.invalidateSize(), 60);
        }
      })
      .catch(() => !cancelled && setStatus("error"));

    return () => {
      cancelled = true;
      roRef.current?.disconnect();
      roRef.current = null;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Render markers once the map is ready, and whenever they change. `status` is in
  // the deps so this re-runs after the async Leaflet init flips the map to "ready"
  // — otherwise a static (read-only) marker set would never paint, because none of
  // the other deps change after mount.
  useEffect(() => {
    const L = LRef.current;
    const group = layerRef.current;
    if (!L || !group) return;
    group.clearLayers();
    for (const m of markers) {
      const marker = L.marker([m.lat, m.lng], {
        icon: pinIcon(L, KIND_COLOR[m.kind] ?? KIND_COLOR.other, m.id === selectedId),
        draggable: editable,
        title: m.name,
      });
      marker.bindTooltip(m.name, { direction: "top", offset: [0, -28] });
      if (editable) {
        marker.on("dragend", () => {
          const ll = marker.getLatLng();
          onMarkerMove?.(m.id, ll.lat, ll.lng);
        });
        marker.on("click", () => onSelect?.(m.id));
      }
      marker.addTo(group);
    }
  }, [markers, selectedId, editable, onMarkerMove, onSelect, status]);

  // Recenter when center/zoom props change from outside (non-editable display, or
  // programmatic). `status` keeps this correct when the map becomes ready after mount.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || editable) return;
    map.setView([center.lat, center.lng], zoom);
  }, [center.lat, center.lng, zoom, editable, status]);

  return (
    <div className={cn("relative overflow-hidden bg-secondary", className)}>
      <div ref={elRef} className="h-full w-full" />
      {status !== "ready" && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-muted-foreground">
          {status === "error" ? "Map unavailable (check connection)" : "Loading map…"}
        </div>
      )}
    </div>
  );
}
