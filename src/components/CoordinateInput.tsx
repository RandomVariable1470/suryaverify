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
    <Card className="p-8 shadow-[0_2px_8px_hsla(150,15%,20%,0.08)] border border-border rounded-2xl animate-fade-in w-full max-w-md">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-xl bg-primary/10 mb-2">
            <MapPin className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Enter Coordinates</h2>
          <p className="text-sm text-muted-foreground">Provide location for solar verification</p>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-foreground mb-2 block">
              Latitude
            </label>
            <Input
              type="number"
              step="any"
              placeholder="28.6448"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              className="h-11 font-mono border-border focus:border-primary transition-colors"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-foreground mb-2 block">
              Longitude
            </label>
            <Input
              type="number"
              step="any"
              placeholder="77.2167"
              value={lon}
              onChange={(e) => setLon(e.target.value)}
              className="h-11 font-mono border-border focus:border-primary transition-colors"
            />
          </div>
        </div>

        <Button 
          type="submit" 
          className="w-full h-12 text-base font-semibold shadow-sm hover:shadow-md active:scale-[0.98] transition-all duration-200"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
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
