import { useState } from "react";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { MapPin, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface CoordinateInputProps {
  onVerify: (lat: number, lon: number) => void;
  isLoading: boolean;
}

const CoordinateInput = ({ onVerify, isLoading }: CoordinateInputProps) => {
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);

    if (isNaN(latitude) || isNaN(longitude)) {
      toast.error("Please enter valid coordinates");
      return;
    }

    if (latitude < 8 || latitude > 37 || longitude < 68 || longitude > 97) {
      toast.error("Coordinates must be within India");
      return;
    }

    onVerify(latitude, longitude);
  };

  return (
    <Card className="p-4 bg-card/95 backdrop-blur-sm shadow-lg">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <MapPin className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm text-foreground">Enter Coordinates</h3>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Latitude</label>
            <Input
              type="number"
              step="any"
              placeholder="28.6448"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              className="text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Longitude</label>
            <Input
              type="number"
              step="any"
              placeholder="77.2167"
              value={lon}
              onChange={(e) => setLon(e.target.value)}
              className="text-sm"
            />
          </div>
        </div>

        <Button 
          type="submit" 
          className="w-full bg-primary hover:bg-primary/90 transition-colors"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Verifying...
            </>
          ) : (
            "Run Verification"
          )}
        </Button>
      </form>
    </Card>
  );
};

export default CoordinateInput;
