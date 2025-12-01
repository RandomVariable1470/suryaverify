import { useState } from "react";
import Header from "@/components/Header";
import MapView from "@/components/MapView";
import ResultsPanel from "@/components/ResultsPanel";
import CoordinateInput from "@/components/CoordinateInput";
import VerificationProgress from "@/components/VerificationProgress";
import { VerificationResult } from "@/types/verification";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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
      // Call AI-powered verification edge function
      const { data, error } = await supabase.functions.invoke('verify-solar', {
        body: { lat, lon }
      });

      if (error) {
        console.error('Verification error:', error);
        
        // Check for specific payment/credits error
        if (error?.message?.includes('payment') || error?.message?.includes('credits')) {
          toast.error('⚠️ Out of AI Credits', {
            description: 'Please add credits to your workspace: Settings → Workspace → Usage',
            duration: 8000,
          });
        } else {
          toast.error(error.message || 'Failed to verify location');
        }
        
        setIsVerifying(false);
        return;
      }

      // Check if data contains an error (edge function returned error in response body)
      if (data?.error) {
        console.error('Verification error:', data.error);
        
        // Check for specific payment/credits error
        if (data.error.includes('payment') || data.error.includes('credits')) {
          toast.error('⚠️ Out of AI Credits', {
            description: 'Please add credits to your workspace: Settings → Workspace → Usage',
            duration: 8000,
          });
        } else {
          toast.error('Verification failed. Please try again.');
        }
        
        setIsVerifying(false);
        return;
      }

      if (!data) {
        toast.error('No data returned from verification');
        setIsVerifying(false);
        return;
      }

      setResult(data);
      setAllResults([data]);
      setCurrentResultIndex(0);
      toast.success(data.has_solar ? 'Solar panels detected!' : 'No solar panels found');
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
      setVerificationProgress({ current: i, total: coords.length });
      try {
        const coord = coords[i];
        const body: any = {};
        
        if (coord.imageData) {
          body.imageData = coord.imageData;
        } else {
          body.lat = coord.lat;
          body.lon = coord.lon;
          if (coord.sample_id) {
            body.sample_id = coord.sample_id;
          }
        }

        const { data, error } = await supabase.functions.invoke('verify-solar', {
          body
        });

        if (!error && data) {
          // Check if data contains an error (edge function returned error in response body)
          if (data.error) {
            console.error('Verification error:', data.error);
            
            // Check for specific payment/credits error
            if (data.error.includes('payment') || data.error.includes('credits')) {
              setIsVerifying(false);
              toast.error('⚠️ Out of AI Credits', {
                description: 'Please add credits to your workspace: Settings → Workspace → Usage',
                duration: 8000,
              });
              return;
            }
            
            failCount++;
          } else {
            batchResults.push(data);
            successCount++;
          }
        } else {
          console.error('Verification error:', error);
          
          // Check for specific payment/credits error in error object
          if (error?.message?.includes('payment') || error?.message?.includes('credits')) {
            setIsVerifying(false);
            toast.error('⚠️ Out of AI Credits', {
              description: 'Please add credits to your workspace: Settings → Workspace → Usage',
              duration: 8000,
            });
            return;
          }
          
          failCount++;
        }
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

    // Check if we should export GeoJSON or regular JSON
    const hasDetectionPolygons = allResults.some(r => r.detection_polygons && r.detection_polygons.length > 0);
    
    if (hasDetectionPolygons) {
      // Export as GeoJSON FeatureCollection
      const features: any[] = [];
      
      allResults.forEach((result) => {
        if (!result.detection_polygons || result.detection_polygons.length === 0) {
          // Include location point even if no detections
          features.push({
            type: "Feature",
            id: `verification_${result.sample_id}`,
            geometry: {
              type: "Point",
              coordinates: [result.lon, result.lat]
            },
            properties: {
              sample_id: result.sample_id,
              has_solar: result.has_solar,
              confidence: result.confidence,
              qc_status: result.qc_status,
              verification_type: "no_detection"
            }
          });
        } else {
          result.detection_polygons.forEach((polygon, idx) => {
            features.push({
              type: "Feature",
              id: `detection_${result.sample_id}_${idx + 1}`,
              geometry: {
                type: polygon.type,
                coordinates: polygon.coordinates
              },
              properties: {
                sample_id: result.sample_id,
                zone_id: idx + 1,
                center_lat: result.lat,
                center_lon: result.lon,
                has_solar: result.has_solar,
                overall_confidence: result.confidence,
                zone_confidence: polygon.confidence,
                panel_count: result.panel_count_est,
                pv_area_sqm: result.pv_area_sqm_est,
                capacity_kw: result.capacity_kw_est,
                qc_status: result.qc_status,
                verification_type: "solar_detection",
                detection_method: "AI-powered satellite imagery analysis"
              }
            });
          });
        }
      });

      const geojson = {
        type: "FeatureCollection",
        metadata: {
          export_date: new Date().toISOString(),
          total_verifications: allResults.length,
          total_detections: allResults.filter(r => r.has_solar).length,
          source: "SuryaVerify - PM Surya Ghar Verification System",
          export_format: "GeoJSON"
        },
        features
      };

      const geojsonStr = JSON.stringify(geojson, null, 2);
      const blob = new Blob([geojsonStr], { type: 'application/geo+json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `verification_results_${new Date().toISOString().split('T')[0]}.geojson`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(`Exported ${allResults.length} results as GeoJSON`);
    } else {
      // Export as regular JSON if no polygons
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
