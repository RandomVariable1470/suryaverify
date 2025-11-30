import { useEffect, useRef } from "react";
import { Card } from "./ui/card";
import { AlertCircle } from "lucide-react";

interface MapViewProps {
  coordinates: { lat: number; lon: number } | null;
}

const MapView = ({ coordinates }: MapViewProps) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Mapbox integration will go here
    // For now, showing placeholder
  }, [coordinates]);

  return (
    <div className="w-full h-full relative bg-muted/30">
      <div ref={mapContainerRef} className="w-full h-full" />
      
      {!coordinates && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Card className="p-6 max-w-sm text-center bg-card/95 backdrop-blur-sm">
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold mb-2 text-foreground">No Location Selected</h3>
            <p className="text-sm text-muted-foreground">
              Enter coordinates above to begin verification
            </p>
            <p className="text-xs text-muted-foreground mt-2 border-t border-border pt-2">
              Mapbox API key required for satellite imagery
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
