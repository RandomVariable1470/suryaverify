import { useEffect, useRef, useState } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { AlertCircle, RefreshCw, Maximize2, Eye, Info } from "lucide-react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

import { toast } from "sonner";

interface MapViewProps {
  coordinates: { lat: number; lon: number } | null;
  detectionPolygons?: Array<{
    type: 'Polygon';
    coordinates: number[][][];
    confidence: number;
  }>;
}

const MapView = ({
  coordinates,
  detectionPolygons
}: MapViewProps) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const [isLoadingToken, setIsLoadingToken] = useState(true);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [showPVMask, setShowPVMask] = useState(false);

  useEffect(() => {
    const initializeMap = async () => {
      try {
        const token = import.meta.env.VITE_MAPBOX_TOKEN;

        if (!token) {
          console.error('Mapbox token not configured');
          toast.error('Could not load map: Token missing');
          setIsLoadingToken(false);
          return;
        }

        mapboxgl.accessToken = token;

        mapRef.current = new mapboxgl.Map({
          container: mapContainerRef.current!,
          style: 'mapbox://styles/mapbox/satellite-streets-v12',
          center: [78.9629, 20.5937],
          zoom: 4,
          pitch: 0,
        });

        mapRef.current.addControl(
          new mapboxgl.NavigationControl({
            visualizePitch: true,
          }),
          'top-right'
        );

        // Track map load state
        mapRef.current.on('load', () => {
          setIsMapLoaded(true);
        });

        setIsLoadingToken(false);
      } catch (err) {
        console.error('Map initialization error:', err);
        toast.error('Failed to initialize map');
        setIsLoadingToken(false);
      }
    };

    initializeMap();

    return () => {
      if (markerRef.current) {
        markerRef.current.remove();
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update marker and fly to coordinates
  useEffect(() => {
    if (!coordinates || !mapRef.current || !isMapLoaded) return;

    // Remove existing marker
    if (markerRef.current) {
      markerRef.current.remove();
    }

    // Create custom marker with animation
    const el = document.createElement('div');
    el.className = 'animate-bounce-in';
    el.style.width = '32px';
    el.style.height = '32px';
    el.style.backgroundImage = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%231a4d2e'%3E%3Cpath d='M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z'/%3E%3C/svg%3E")`;
    el.style.backgroundSize = 'contain';
    el.style.cursor = 'pointer';

    markerRef.current = new mapboxgl.Marker({ element: el })
      .setLngLat([coordinates.lon, coordinates.lat])
      .addTo(mapRef.current);

    // Smooth fly animation
    mapRef.current.flyTo({
      center: [coordinates.lon, coordinates.lat],
      zoom: 19,
      pitch: 45,
      duration: 2000,
      essential: true,
      easing: (t) => t * (2 - t), // ease-out
    });
  }, [coordinates, isMapLoaded]);

  // Add detection polygons overlay (PV Mask)
  useEffect(() => {
    if (!mapRef.current || !detectionPolygons || !showPVMask) return;

    const map = mapRef.current;

    // Wait for map to be loaded
    if (!map.isStyleLoaded()) {
      map.once('load', () => addPolygons());
    } else {
      addPolygons();
    }

    function addPolygons() {
      if (!mapRef.current || !detectionPolygons) return;
      const map = mapRef.current;

      // Remove existing source and layer if they exist
      if (map.getLayer('detection-polygons')) {
        map.removeLayer('detection-polygons');
      }
      if (map.getLayer('detection-polygons-outline')) {
        map.removeLayer('detection-polygons-outline');
      }
      if (map.getSource('detection-polygons')) {
        map.removeSource('detection-polygons');
      }

      if (detectionPolygons.length === 0) return;

      // Add source
      map.addSource('detection-polygons', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: detectionPolygons.map((polygon, idx) => ({
            type: 'Feature',
            properties: {
              confidence: polygon.confidence,
              id: idx
            },
            geometry: polygon
          }))
        }
      });

      // Add fill layer
      map.addLayer({
        id: 'detection-polygons',
        type: 'fill',
        source: 'detection-polygons',
        paint: {
          'fill-color': 'hsl(38, 92%, 50%)', // Saffron
          'fill-opacity': 0.3
        }
      });

      // Add outline layer
      map.addLayer({
        id: 'detection-polygons-outline',
        type: 'line',
        source: 'detection-polygons',
        paint: {
          'line-color': 'hsl(38, 92%, 50%)',
          'line-width': 3,
          'line-opacity': 0.8,
          'line-dasharray': [2, 2]
        }
      });

      toast.success(`${detectionPolygons.length} detection zone${detectionPolygons.length > 1 ? 's' : ''} displayed`);
    }

    return () => {
      if (!mapRef.current) return;
      const map = mapRef.current;
      if (map.getLayer('detection-polygons')) {
        map.removeLayer('detection-polygons');
      }
      if (map.getLayer('detection-polygons-outline')) {
        map.removeLayer('detection-polygons-outline');
      }
      if (map.getSource('detection-polygons')) {
        map.removeSource('detection-polygons');
      }
    };
  }, [detectionPolygons, showPVMask]);

  const handleRefresh = () => {
    if (mapRef.current && coordinates) {
      mapRef.current.flyTo({
        center: [coordinates.lon, coordinates.lat],
        zoom: 19,
        pitch: 45,
        duration: 1500,
        essential: true,
      });
      toast.success("Imagery refreshed");
    }
  };

  return (
    <div className="w-full h-full relative bg-muted/20">
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Map Control Buttons */}
      {coordinates && !isLoadingToken && (
        <div className="absolute top-6 right-6 z-10 flex flex-col gap-2 animate-fade-in">
          <Button
            size="sm"
            variant={showPVMask ? "default" : "secondary"}
            className="shadow-lg backdrop-blur-sm bg-card/95 hover:bg-card border-border/50 transition-all"
            onClick={() => {
              if (!detectionPolygons || detectionPolygons.length === 0) {
                toast.error("No detection zones available");
                return;
              }
              setShowPVMask(!showPVMask);
            }}
            disabled={!detectionPolygons || detectionPolygons.length === 0}
          >
            <Eye className="w-4 h-4 mr-2" />
            PV Mask
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="shadow-lg backdrop-blur-sm bg-card/95 hover:bg-card border-border/50 transition-all"
            onClick={handleRefresh}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="shadow-lg backdrop-blur-sm bg-card/95 hover:bg-card border-border/50 transition-all"
            onClick={() => {
              if (mapRef.current) {
                mapRef.current.setPitch(mapRef.current.getPitch() === 0 ? 60 : 0);
              }
            }}
          >
            <Maximize2 className="w-4 h-4 mr-2" />
            3D View
          </Button>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoadingToken && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm z-20">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          </div>
          <p className="mt-4 text-sm text-muted-foreground animate-pulse">Loading satellite imagery...</p>
        </div>
      )}

      {/* Loading State Before Coordinates */}
      {!coordinates && !isLoadingToken && (
        <Card className="absolute inset-0 m-auto w-96 h-64 flex flex-col items-center justify-center border-2 border-dashed border-border/50 bg-card/50 backdrop-blur-sm">
          <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
          <p className="text-lg font-semibold text-foreground mb-2">No Location Selected</p>
          <p className="text-sm text-muted-foreground text-center px-6">
            Enter coordinates to view satellite imagery
          </p>
        </Card>
      )}

      {/* Mapbox Attribution (Required) */}
      {coordinates && (
        <div className="absolute bottom-3 left-3 bg-background/90 backdrop-blur-sm text-xs px-3 py-1.5 rounded shadow-sm border border-border/50 z-10">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Info className="w-3 h-3" />
            <span>Data licensed from Mapbox — for prototype demonstration only</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapView;
