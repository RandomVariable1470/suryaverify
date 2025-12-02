import { useState } from "react";
import Header from "@/components/Header";
import MapView from "@/components/MapView";
import ResultsPanel from "@/components/ResultsPanel";
import CoordinateInput from "@/components/CoordinateInput";
import VerificationProgress from "@/components/VerificationProgress";
import { VerificationResult } from "@/types/verification";
import { toast } from "sonner";
import { fetchSatelliteImage } from "@/services/mapboxService";
import { analyzeSolarPotential } from "@/services/inferenceService";
import { exportResults, exportBatchToZip } from "@/services/exportService";

const Index = () => {
  const [coordinates, setCoordinates] = useState<{ lat: number; lon: number } | null>(null);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [allResults, setAllResults] = useState<VerificationResult[]>([]);
  const [currentResultIndex, setCurrentResultIndex] = useState<number>(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isImageBased, setIsImageBased] = useState(false);
  const [verificationProgress, setVerificationProgress] = useState({ current: 0, total: 0 });

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
    setVerificationProgress({ current: 0, total: 1 });
    setCoordinates({ lat, lon });

    try {
      let base64Image: string;

      // 1. Fetch Satellite Image
      try {
        base64Image = await fetchSatelliteImage(lat, lon);
      } catch (error) {
        console.error('Mapbox error:', error);
        toast.error('Failed to fetch satellite imagery. Check your Mapbox token.');
        setIsVerifying(false);
        return;
      }

      // 2. Analyze with Gemini
      try {
        const data = await analyzeSolarPotential(base64Image, lat, lon);
        setResult(data);
        setAllResults([data]);
        setCurrentResultIndex(0);
        toast.success(data.has_solar ? 'Solar panels detected!' : 'No solar panels found');
      } catch (error) {
        console.error('Gemini error:', error);
        toast.error('AI analysis failed. Check your Gemini API key.');
      }
    } catch (err) {
      console.error('Verification failed:', err);
      toast.error('Verification failed. Please try again.');
    } finally {
      setIsVerifying(false);
      setVerificationProgress({ current: 0, total: 0 });
    }
  };

  const handleBulkUpload = async (coords: Array<{ lat: number; lon: number; sample_id?: string; imageData?: string }>) => {
    const isImage = coords[0]?.imageData !== undefined;
    setIsImageBased(isImage);

    // Set loading state IMMEDIATELY before any async operations
    setIsVerifying(true);
    setVerificationProgress({ current: 0, total: coords.length });

    // Show the loading screen for a moment before processing
    await new Promise(resolve => setTimeout(resolve, 100));

    toast.info(`Processing ${coords.length} location${coords.length > 1 ? 's' : ''}...`);

    const batchResults: VerificationResult[] = [];
    let successCount = 0;
    let failCount = 0;

    // Process all locations
    for (let i = 0; i < coords.length; i++) {
      setVerificationProgress({ current: i + 1, total: coords.length }); // Update progress to i+1
      try {
        const coord = coords[i];
        let base64Image: string;
        let lat = coord.lat;
        let lon = coord.lon;

        if (coord.imageData) {
          // Direct image upload
          base64Image = coord.imageData.startsWith('data:') ? coord.imageData.split(',')[1] : coord.imageData;
          // Use dummy coordinates if not provided (or keep 0,0)
          lat = lat || 0;
          lon = lon || 0;
        } else {
          // Fetch from Mapbox
          try {
            base64Image = await fetchSatelliteImage(lat, lon);
          } catch (e) {
            console.error(`Failed to fetch image for ${lat}, ${lon}`, e);
            failCount++;
            continue;
          }
        }

        const data = await analyzeSolarPotential(base64Image, lat, lon, coord.sample_id);
        batchResults.push(data);
        successCount++;

      } catch (err) {
        console.error('Bulk verification error:', err);
        failCount++;
      }
    }

    setIsVerifying(false);
    setVerificationProgress({ current: 0, total: 0 });

    if (batchResults.length > 0) {
      setAllResults(batchResults);
      setCurrentResultIndex(0);
      setResult(batchResults[0]);
      if (!isImage) {
        setCoordinates({ lat: batchResults[0].lat, lon: batchResults[0].lon });
      }
      toast.success(`Completed ${successCount} of ${coords.length} verifications`);
    }

    if (failCount > 0) {
      toast.error(`${failCount} verifications failed`);
    }
  };

  const handleReset = () => {
    setCoordinates(null);
    setResult(null);
    setAllResults([]);
    setCurrentResultIndex(0);
    setIsImageBased(false);
  };

  const handleNextResult = () => {
    if (currentResultIndex < allResults.length - 1) {
      const newIndex = currentResultIndex + 1;
      setCurrentResultIndex(newIndex);
      setResult(allResults[newIndex]);
      if (!isImageBased) {
        setCoordinates({ lat: allResults[newIndex].lat, lon: allResults[newIndex].lon });
      }
    }
  };

  const handlePrevResult = () => {
    if (currentResultIndex > 0) {
      const newIndex = currentResultIndex - 1;
      setCurrentResultIndex(newIndex);
      setResult(allResults[newIndex]);
      if (!isImageBased) {
        setCoordinates({ lat: allResults[newIndex].lat, lon: allResults[newIndex].lon });
      }
    }
  };

  const handleExport = () => {
    if (allResults.length === 0) {
      toast.error("No results to export");
      return;
    }

    // If multiple results (batch), use ZIP export
    if (allResults.length > 1) {
      exportBatchToZip(allResults);
      toast.success(`Exporting ${allResults.length} results as ZIP`);
    } else {
      // Single result
      exportResults(allResults);
    }
  };

  // Two-screen mode: show input OR results (including during verification)
  const showResults = coordinates !== null || isVerifying || result !== null;

  return (
    <div className="flex flex-col h-screen bg-background">
      <Header />

      {!showResults ? (
        /* Screen 1: Coordinate Input (No Map) */
        <div className="flex-1 flex items-center justify-center p-6">
          <CoordinateInput
            onVerify={handleVerify}
            onBulkUpload={handleBulkUpload}
            isLoading={isVerifying}
          />
        </div>
      ) : (
        /* Screen 2: Results View (Split Pane or Full Results) */
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Left Pane - Map View or Progress */}
          {!isImageBased && coordinates && (
            <div className="lg:w-[63%] h-[50vh] lg:h-full relative border-b lg:border-b-0 lg:border-r border-border">
              {isVerifying ? (
                <VerificationProgress
                  currentIndex={verificationProgress.current}
                  totalCount={verificationProgress.total}
                  isImageBased={false}
                />
              ) : (
                <MapView
                  coordinates={coordinates}
                  detectionPolygons={result?.detection_polygons}
                />
              )}
            </div>
          )}

          {/* Right Pane - Results or Progress (for image-based) */}
          <div className={`${isImageBased ? 'w-full' : 'lg:w-[37%]'} h-[50vh] lg:h-full overflow-y-auto bg-background`}>
            {isVerifying && isImageBased ? (
              <VerificationProgress
                currentIndex={verificationProgress.current}
                totalCount={verificationProgress.total}
                isImageBased={true}
              />
            ) : (
              <ResultsPanel
                result={result}
                isLoading={isVerifying}
                allResults={allResults}
                currentResultIndex={currentResultIndex}
                onNext={handleNextResult}
                onPrev={handlePrevResult}
                onReset={handleReset}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;
