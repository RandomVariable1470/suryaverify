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
    <Card className="p-5 bg-card/95 backdrop-blur-md shadow-xl border-border/50 rounded-xl animate-fade-in hover:shadow-2xl transition-all duration-300">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <MapPin className="w-4 h-4 text-primary" />
          </div>
          <h3 className="font-semibold text-sm text-foreground">Enter Coordinates</h3>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block flex items-center gap-1">
              <span className="text-primary">•</span> Latitude
            </label>
            <Input
              type="number"
              step="any"
              placeholder="28.6448"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              className="text-sm font-mono h-9 border-border/50 focus:border-primary/50 transition-colors"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block flex items-center gap-1">
              <span className="text-primary">•</span> Longitude
            </label>
            <Input
              type="number"
              step="any"
              placeholder="77.2167"
              value={lon}
              onChange={(e) => setLon(e.target.value)}
              className="text-sm font-mono h-9 border-border/50 focus:border-primary/50 transition-colors"
            />
          </div>
        </div>

        <Button 
          type="submit" 
          className="w-full bg-primary hover:bg-primary/90 h-10 text-sm font-semibold shadow-md hover:shadow-lg active:scale-[0.98] transition-all duration-200"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Verifying...
            </>
          ) : (
            <>
              <MapPin className="w-4 h-4 mr-2" />
              Run Verification
            </>
          )}
        </Button>
      </form>
    </Card>
  );
};

export default CoordinateInput;
