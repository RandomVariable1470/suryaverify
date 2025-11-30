import { useEffect, useRef, useState } from "react";
import { Card } from "./ui/card";
import { AlertCircle } from "lucide-react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MapViewProps {
  coordinates: { lat: number; lon: number } | null;
}

const MapView = ({ coordinates }: MapViewProps) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const [isLoadingToken, setIsLoadingToken] = useState(true);

  useEffect(() => {
    const initializeMap = async () => {
      try {
        // Fetch Mapbox token from edge function
        const { data, error } = await supabase.functions.invoke('get-mapbox-token');
        
        if (error || !data?.token) {
          console.error('Failed to fetch Mapbox token:', error);
          toast.error('Failed to load map configuration');
          setIsLoadingToken(false);
          return;
        }

        mapboxgl.accessToken = data.token;
        
        if (!mapContainerRef.current || mapRef.current) return;

        // Initialize map
        mapRef.current = new mapboxgl.Map({
          container: mapContainerRef.current,
          style: 'mapbox://styles/mapbox/satellite-streets-v12',
          center: [78.9629, 20.5937], // Center of India
          zoom: 4,
        });

        mapRef.current.addControl(
          new mapboxgl.NavigationControl(),
          'top-right'
        );

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

  useEffect(() => {
    if (!mapRef.current || !coordinates) return;

    // Remove existing marker
    if (markerRef.current) {
      markerRef.current.remove();
    }

    // Add new marker
    markerRef.current = new mapboxgl.Marker({ color: '#1a4d2e' })
      .setLngLat([coordinates.lon, coordinates.lat])
      .addTo(mapRef.current);

    // Fly to location
    mapRef.current.flyTo({
      center: [coordinates.lon, coordinates.lat],
      zoom: 18,
      essential: true
    });
  }, [coordinates]);

  return (
    <div className="w-full h-full relative bg-muted/30">
      <div ref={mapContainerRef} className="w-full h-full" />
      
      {isLoadingToken && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <Card className="p-6 max-w-sm text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Loading map...</p>
          </Card>
        </div>
      )}
      
      {!isLoadingToken && !coordinates && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <Card className="p-6 max-w-sm text-center bg-card/95 backdrop-blur-sm">
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold mb-2 text-foreground">No Location Selected</h3>
            <p className="text-sm text-muted-foreground">
              Enter coordinates above to begin verification
            </p>
          </Card>
        </div>
      )}

      {coordinates && (
        <div className="absolute bottom-4 left-4 right-4">
          <Card className="p-3 bg-card/95 backdrop-blur-sm text-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Location:</span>
              <span className="font-mono text-foreground">
                {coordinates.lat.toFixed(6)}, {coordinates.lon.toFixed(6)}
              </span>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default MapView;
