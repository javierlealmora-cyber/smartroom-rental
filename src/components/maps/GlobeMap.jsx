// =============================================================================
// src/components/maps/GlobeMap.jsx
// Globe 3D interactivo — fondo blanco, continentes visibles, puntos naranjas
//
// Estilo visual: fondo blanco limpio con mapa CartoDB Positron (continentes
// en gris claro) y puntos de color naranja/dorado — nunca agrupa (clustering off)
// =============================================================================
import { useRef, useEffect } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// ─── Colores por tipo de punto ──────────────────────────────────────────────────
const COLOR_ACCOMMODATION = "#E8C547"; // dorado pastel — alojamientos
const COLOR_ACTIVE         = "#6BCB8B"; // verde pastel — conexiones activas
const COLOR_RECENT         = "#E87C7C"; // rojo pastel — conexiones recientes

// Expresión MapLibre: color según _type
const COLOR_BY_TYPE = [
  "match", ["get", "_type"],
  "accommodation", COLOR_ACCOMMODATION,
  "active",        COLOR_ACTIVE,
  "recent",        COLOR_RECENT,
  "#888888", // fallback gris
];

// ─── Estilo: fondo blanco, continentes grises, océano celeste muy claro ────────
const GLOBE_STYLE = {
  version: 8,
  projection: { type: "globe" },
  glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
  fog: {},
  sources: {
    basemap: {
      type:     "raster",
      tiles:    ["https://a.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}@2x.png"],
      tileSize: 256,
      maxzoom:  18,
    },
    openmaptiles: {
      type: "vector",
      url:  "https://tiles.openfreemap.org/planet",
    },
  },
  layers: [
    // Fondo global — azul pastel (océano visible donde no hay tiles)
    {
      id: "background", type: "background",
      paint: { "background-color": "#DEEAF6" },
    },

    // Raster base — continentes claros (CartoDB Positron)
    {
      id: "basemap", type: "raster", source: "basemap",
      paint: { "raster-opacity": 1 },
    },

    // Agua vectorial ENCIMA del raster — azul pastel tapa el gris del océano
    {
      id: "water-fill", type: "fill", source: "openmaptiles",
      "source-layer": "water",
      paint: { "fill-color": "#DEEAF6" },
    },

    // Contorno de países — línea fina gris suave
    {
      id: "country-boundary", type: "line", source: "openmaptiles",
      "source-layer": "boundary",
      filter: ["==", "admin_level", 2],
      paint: {
        "line-color":   "rgba(160, 175, 195, 0.5)",
        "line-width":   ["interpolate",["linear"],["zoom"], 0,0.4, 4,0.7, 8,1],
      },
    },

    // Nombres de ciudades (zoom 5–14)
    {
      id: "place-city", type: "symbol", source: "openmaptiles",
      "source-layer": "place",
      filter: ["in", "class", "city"],
      minzoom: 5,
      maxzoom: 14,
      layout: {
        "text-field":     ["coalesce",["get","name:es"],["get","name"]],
        "text-font":      ["Noto Sans Regular"],
        "text-size":      ["interpolate",["linear"],["zoom"],5,8,8,10,12,12],
        "text-max-width": 8,
      },
      paint: {
        "text-color":      "rgba(60, 80, 100, 0.7)",
        "text-halo-color": "rgba(255,255,255,0.9)",
        "text-halo-width": 1.5,
      },
    },

    // Nombres de calles — zoom alto
    {
      id: "road-labels", type: "symbol", source: "openmaptiles",
      "source-layer": "transportation_name",
      minzoom: 15,
      layout: {
        "text-field":       ["coalesce",["get","name:es"],["get","name"]],
        "text-font":        ["Noto Sans Regular"],
        "text-size":        ["interpolate",["linear"],["zoom"],15,9,17,11,18,13],
        "symbol-placement": "line",
        "text-max-angle":   30,
      },
      paint: {
        "text-color":      "rgba(80, 90, 110, 0.7)",
        "text-halo-color": "rgba(255,255,255,0.85)",
        "text-halo-width": 1.5,
      },
    },
  ],
};

function makeGeoJSON(pts) {
  return {
    type: "FeatureCollection",
    features: pts.map((p, i) => ({
      type:     "Feature",
      id:       i,
      geometry: { type: "Point", coordinates: [p.lng, p.lat] },
      properties: { ...p },
    })),
  };
}

export default function GlobeMap({ height = 280, points = [], onPointClick }) {
  const containerRef = useRef(null);
  const mapRef       = useRef(null);
  const popupRef     = useRef(null);
  // Ref para acceso siempre-actual dentro del closure de init (deps:[])
  const pointsRef    = useRef(points);
  const clickCbRef   = useRef(onPointClick);

  useEffect(() => { pointsRef.current  = points;      }, [points]);
  useEffect(() => { clickCbRef.current = onPointClick; }, [onPointClick]);

  // ── Inicializar mapa ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container:          containerRef.current,
      style:              GLOBE_STYLE,
      center:             [0, 20],
      zoom:               1.0,
      minZoom:            0.5,
      maxZoom:            18,
      attributionControl: false,
    });

    map.on("load", () => {

      // ── Fuente sin clustering — puntos individuales ──
      map.addSource("sr-points", {
        type: "geojson",
        data: makeGeoJSON(pointsRef.current),
      });

      // ── Fuente con clustering — solo para el aura (detectar agrupaciones) ──
      map.addSource("sr-points-clustered", {
        type: "geojson",
        data: makeGeoJSON(pointsRef.current),
        cluster: true,
        clusterRadius: 40,
        clusterMaxZoom: 14,
      });

      // ── Aura — solo en clusters con 2+ puntos ──────────────────────────
      map.addLayer({
        id: "sr-aura", type: "circle", source: "sr-points-clustered",
        filter: ["has", "point_count"],
        paint: {
          "circle-color":   "#E8C547",
          "circle-radius":  ["interpolate",["linear"],["zoom"],
            0,10,  2,12,  4,14,  8,16,  12,18,  16,20,
          ],
          "circle-opacity": 0.2,
          "circle-blur":    0.8,
        },
      });

      // ── Punto sólido — color por tipo ──────────────────────────────────
      map.addLayer({
        id: "sr-circles", type: "circle", source: "sr-points",
        paint: {
          "circle-color":          COLOR_BY_TYPE,
          "circle-radius":         ["interpolate",["linear"],["zoom"],
            0,2,  2,2.5,  4,3,  8,3.5,  12,4,  16,5,
          ],
          "circle-opacity":        1,
          "circle-stroke-width":   0,
        },
      });

      // ── Etiqueta: ciudad en zoom bajo (orientación) ──────────────────────────
      map.addLayer({
        id: "sr-label-city", type: "symbol", source: "sr-points",
        minzoom: 4,
        maxzoom: 10,
        layout: {
          "text-field":         ["get", "city"],
          "text-font":          ["Noto Sans Regular"],
          "text-size":          ["interpolate",["linear"],["zoom"],4,9,7,11,9,12],
          "text-offset":        [0, 1.6],
          "text-anchor":        "top",
          "text-allow-overlap": false,
        },
        paint: {
          "text-color":      "rgba(50, 60, 80, 0.85)",
          "text-halo-color": "rgba(255,255,255,0.9)",
          "text-halo-width": 1.5,
          "text-opacity":    ["interpolate",["linear"],["zoom"],4,0,5.5,1,9,1,10,0],
        },
      });

      // ── Etiqueta: nombre completo (calle) desde zoom 10 ──────────────────────
      map.addLayer({
        id: "sr-label-street", type: "symbol", source: "sr-points",
        minzoom: 10,
        layout: {
          "text-field":         ["get", "name"],
          "text-font":          ["Noto Sans Regular"],
          "text-size":          ["interpolate",["linear"],["zoom"],10,10,13,11,16,12],
          "text-offset":        [0, 1.5],
          "text-anchor":        "top",
          "text-allow-overlap": false,
          "text-max-width":     12,
        },
        paint: {
          "text-color":      "rgba(40, 50, 70, 0.85)",
          "text-halo-color": "rgba(255,255,255,0.9)",
          "text-halo-width": 1.5,
          "text-opacity":    ["interpolate",["linear"],["zoom"],10,0,11,1],
        },
      });
    });

    // ── Click en punto individual ─────────────────────────────────────────────
    map.on("click", "sr-circles", (e) => {
      const props = e.features?.[0]?.properties;
      if (props && clickCbRef.current) clickCbRef.current(props);
    });

    // ── Cursores ──────────────────────────────────────────────────────────────
    map.on("mouseenter", "sr-circles",  () => { map.getCanvas().style.cursor = "pointer"; });
    map.on("mouseleave", "sr-circles",  () => { map.getCanvas().style.cursor = ""; });

    // ── Tooltip hover en puntos individuales ──────────────────────────────────
    map.on("mouseenter", "sr-circles", (e) => {
      map.getCanvas().style.cursor = "pointer";
      const feat = e.features?.[0];
      if (!feat) return;
      const p = feat.properties;
      const html = p._type === "accommodation"
        ? `<b style="color:#1A2438">${p.name || p.city}</b><br/><span>${p.city} · ${p.client}</span>`
        : p._type === "active"
          ? `<b style="color:#1A2438">Conexión activa</b><br/><span>${p.city} · ${p.client}</span>`
          : `<b style="color:#1A2438">Conexión reciente</b><br/><span>${p.city} · hace ${p.daysAgo}d</span>`;
      popupRef.current?.remove();
      popupRef.current = new maplibregl.Popup({
        closeButton: false, closeOnClick: false, offset: 14, className: "sr-popup",
      })
        .setLngLat(feat.geometry.coordinates)
        .setHTML(`<div style="font:12px/1.6 -apple-system,sans-serif">${html}</div>`)
        .addTo(map);
    });
    map.on("mouseleave", "sr-circles", () => {
      map.getCanvas().style.cursor = "";
      popupRef.current?.remove();
      popupRef.current = null;
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");

    // ── Botón reset: vuelve a la vista inicial y reanuda rotación ──────────
    class ResetControl {
      onAdd(m) {
        this._map = m;
        this._container = document.createElement("div");
        this._container.className = "maplibregl-ctrl maplibregl-ctrl-group";
        const btn = document.createElement("button");
        btn.type = "button";
        btn.title = "Vista inicial";
        btn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9"/><path d="M3 3v6h6"/></svg>`;
        btn.addEventListener("click", () => {
          m.easeTo({ center: [0, 20], zoom: 1.0, duration: 800 });
          spinning = true;
          setTimeout(spinGlobe, 900);
        });
        this._container.appendChild(btn);
        return this._container;
      }
      onRemove() { this._container.remove(); }
    }
    map.addControl(new ResetControl(), "bottom-right");

    mapRef.current = map;

    // ── Auto-rotación del globe ───────────────────────────────────────────────
    let spinning = true;
    const spinSpeed = 0.12; // grados por frame

    function spinGlobe() {
      if (!spinning) return;
      const center = map.getCenter();
      center.lng += spinSpeed;
      map.easeTo({ center, duration: 0, easing: (t) => t });
      requestAnimationFrame(spinGlobe);
    }

    // Pausar al interactuar, reanudar tras inactividad
    let resumeTimer = null;
    const RESUME_DELAY = 3000;

    function stopSpin() {
      spinning = false;
      clearTimeout(resumeTimer);
    }
    function scheduleResume() {
      clearTimeout(resumeTimer);
      resumeTimer = setTimeout(() => { spinning = true; spinGlobe(); }, RESUME_DELAY);
    }

    map.on("mousedown",  stopSpin);
    map.on("touchstart", stopSpin);
    map.on("wheel",      stopSpin);
    map.on("zoomstart",  stopSpin);

    map.on("mouseup",    scheduleResume);
    map.on("touchend",   scheduleResume);
    map.on("dragend",    scheduleResume);
    map.on("zoomend",    scheduleResume);

    // Iniciar rotación cuando el mapa esté listo
    map.once("idle", () => { if (spinning) spinGlobe(); });

    return () => { spinning = false; clearTimeout(resumeTimer); mapRef.current?.remove(); mapRef.current = null; };
  }, []); // solo una vez — datos via pointsRef

  // ── Actualizar puntos cuando cambien props ───────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const geo = makeGeoJSON(points);
    const trySet = () => {
      map.getSource("sr-points")?.setData(geo);
      map.getSource("sr-points-clustered")?.setData(geo);
    };
    if (map.loaded()) trySet();
    else map.once("load", trySet);
  }, [points]);

  return (
    <>
      <style>{`
        .sr-popup .maplibregl-popup-content {
          background: #fff;
          border-radius: 8px;
          padding: 8px 13px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.12);
          border: 1px solid rgba(0,0,0,0.08);
          color: #1A2438;
        }
        .sr-popup .maplibregl-popup-content span { color: #6B7280; }
        .sr-popup .maplibregl-popup-tip { border-top-color: #fff; }
        .maplibregl-ctrl-bottom-right { margin: 0 8px 8px 0; }
        .maplibregl-ctrl-group {
          background: #fff !important;
          border: 1px solid rgba(0,0,0,0.1) !important;
          box-shadow: 0 1px 4px rgba(0,0,0,0.08) !important;
        }
        .maplibregl-ctrl-group button { color: #4B5563 !important; }
      `}</style>
      <div ref={containerRef} style={{ width: "100%", height, borderRadius: "inherit" }} />
    </>
  );
}
