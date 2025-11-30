import { useState } from "react";
import Header from "@/components/Header";
import MapView from "@/components/MapView";
import ResultsPanel from "@/components/ResultsPanel";
import CoordinateInput from "@/components/CoordinateInput";
import { VerificationResult } from "@/types/verification";
import { toast } from "sonner";

const Index = () => {
  const [coordinates, setCoordinates] = useState<{ lat: number; lon: number } | null>(null);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [allResults, setAllResults] = useState<VerificationResult[]>([]);
  const [isVerifying, setIsVerifying] = useState(false);

  const generateMockResult = (lat: number, lon: number, sample_id?: string | number): VerificationResult => {
    return {
      sample_id: sample_id ? (typeof sample_id === 'string' ? parseInt(sample_id) || Math.floor(Math.random() * 10000) : sample_id) : Math.floor(Math.random() * 10000),
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
  };

  const handleVerify = async (lat: number, lon: number) => {
    setIsVerifying(true);
    setCoordinates({ lat, lon });
    
    // Simulate AI verification (mock data for now)
    setTimeout(() => {
      const mockResult = generateMockResult(lat, lon);
      setResult(mockResult);
      setAllResults(prev => [...prev, mockResult]);
      setIsVerifying(false);
    }, 2000);
  };

  const handleBulkUpload = async (coords: Array<{ lat: number; lon: number; sample_id?: string }>) => {
    toast.info(`Processing ${coords.length} locations...`);
    
    // Process first location immediately
    if (coords.length > 0) {
      const firstCoord = coords[0];
      handleVerify(firstCoord.lat, firstCoord.lon);
    }

    // Simulate batch processing for remaining
    setTimeout(() => {
      const batchResults = coords.map(coord => 
        generateMockResult(coord.lat, coord.lon, coord.sample_id)
      );
      setAllResults(prev => [...prev, ...batchResults]);
      toast.success(`Completed verification for ${coords.length} locations`);
    }, 3000);
  };

  const handleExport = () => {
    if (allResults.length === 0) {
      toast.error("No results to export");
      return;
    }

    const dataStr = JSON.stringify(allResults, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `verification_results_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Results exported successfully");
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <Header 
        onBulkUpload={handleBulkUpload}
        onExport={handleExport}
        hasResults={allResults.length > 0}
      />
      
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Panel - Map View (65-70% width) */}
        <div className="lg:w-[68%] h-[50vh] lg:h-full relative border-b lg:border-b-0 lg:border-r border-border/50">
          <MapView coordinates={coordinates} />
          <div className="absolute top-6 left-6 right-6 z-10 max-w-md">
            <CoordinateInput onVerify={handleVerify} isLoading={isVerifying} />
          </div>
        </div>

        {/* Right Panel - Results (30-35% width) */}
        <div className="lg:w-[32%] h-[50vh] lg:h-full overflow-y-auto bg-background">
          <ResultsPanel result={result} isLoading={isVerifying} />
        </div>
      </div>
    </div>
  );
};

export default Index;
