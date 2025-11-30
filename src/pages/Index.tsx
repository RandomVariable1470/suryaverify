import { useState } from "react";
import Header from "@/components/Header";
import MapView from "@/components/MapView";
import ResultsPanel from "@/components/ResultsPanel";
import CoordinateInput from "@/components/CoordinateInput";
import { VerificationResult } from "@/types/verification";

const Index = () => {
  const [coordinates, setCoordinates] = useState<{ lat: number; lon: number } | null>(null);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerify = async (lat: number, lon: number) => {
    setIsVerifying(true);
    setCoordinates({ lat, lon });
    
    // Simulate AI verification (mock data for now)
    setTimeout(() => {
      const mockResult: VerificationResult = {
        sample_id: Math.floor(Math.random() * 10000),
        lat,
        lon,
        has_solar: Math.random() > 0.3,
        confidence: 0.75 + Math.random() * 0.24,
        panel_count_est: Math.floor(Math.random() * 20) + 8,
        pv_area_sqm_est: 15 + Math.random() * 30,
        capacity_kw_est: 3 + Math.random() * 5,
        qc_status: Math.random() > 0.2 ? "VERIFIABLE" : "NOT_VERIFIABLE",
        qc_notes: ["Clear roof view", "Detectable panel grid", "Sufficient resolution"],
        image_metadata: {
          source: "Mapbox Satellite",
          zoom: 20
        }
      };
      setResult(mockResult);
      setIsVerifying(false);
    }, 2000);
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <Header />
      
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Panel - Map View */}
        <div className="lg:w-1/2 h-[50vh] lg:h-full relative border-b lg:border-b-0 lg:border-r border-border">
          <MapView coordinates={coordinates} />
          <div className="absolute top-4 left-4 right-4 z-10">
            <CoordinateInput onVerify={handleVerify} isLoading={isVerifying} />
          </div>
        </div>

        {/* Right Panel - Results */}
        <div className="lg:w-1/2 h-[50vh] lg:h-full overflow-auto">
          <ResultsPanel result={result} isLoading={isVerifying} />
        </div>
      </div>
    </div>
  );
};

export default Index;
