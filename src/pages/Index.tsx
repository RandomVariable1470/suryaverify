import { useState, useMemo } from "react";
import Header from "@/components/Header";
import MapView from "@/components/MapView";
import ResultsPanel from "@/components/ResultsPanel";
import CoordinateInput from "@/components/CoordinateInput";
import { VerificationResult } from "@/types/verification";
import { GroundTruthAnnotation, AnnotationComparison } from "@/types/annotation";
import * as turf from "@turf/turf";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const [coordinates, setCoordinates] = useState<{ lat: number; lon: number } | null>(null);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [allResults, setAllResults] = useState<VerificationResult[]>([]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [annotationMode, setAnnotationMode] = useState(false);
  const [groundTruthAnnotations, setGroundTruthAnnotations] = useState<GroundTruthAnnotation[]>([]);
  const [showComparison, setShowComparison] = useState(false);

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
    
    try {
      // Call AI-powered verification edge function
      const { data, error } = await supabase.functions.invoke('verify-solar', {
        body: { lat, lon }
      });

      if (error) {
        console.error('Verification error:', error);
        toast.error(error.message || 'Failed to verify location');
        setIsVerifying(false);
        return;
      }

      if (!data) {
        toast.error('No data returned from verification');
        setIsVerifying(false);
        return;
      }

      setResult(data);
      setAllResults(prev => [...prev, data]);
      toast.success(data.has_solar ? 'Solar panels detected!' : 'No solar panels found');
    } catch (err) {
      console.error('Verification failed:', err);
      toast.error('Verification failed. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleBulkUpload = async (coords: Array<{ lat: number; lon: number; sample_id?: string; imageData?: string }>) => {
    toast.info(`Processing ${coords.length} location${coords.length > 1 ? 's' : ''}...`);
    
    // Process first location immediately to show on map
    if (coords.length > 0) {
      const firstCoord = coords[0];
      if (firstCoord.imageData) {
        // Direct image upload - call edge function with imageData
        setIsVerifying(true);
        setCoordinates({ lat: firstCoord.lat, lon: firstCoord.lon });
        
        try {
          const { data, error } = await supabase.functions.invoke('verify-solar', {
            body: { 
              lat: firstCoord.lat, 
              lon: firstCoord.lon,
              imageData: firstCoord.imageData,
              sample_id: firstCoord.sample_id 
            }
          });

          if (error) {
            console.error('Image verification error:', error);
            toast.error('Failed to analyze uploaded image');
            setIsVerifying(false);
            return;
          }

          if (data) {
            setResult(data);
            setAllResults(prev => [...prev, data]);
            toast.success(data.has_solar ? 'Solar panels detected in image!' : 'No solar panels found in image');
          }
        } catch (err) {
          console.error('Image verification failed:', err);
          toast.error('Image verification failed. Please try again.');
        } finally {
          setIsVerifying(false);
        }
      } else {
        // Regular coordinate-based verification
        handleVerify(firstCoord.lat, firstCoord.lon);
      }
    }

    // Process remaining locations in background (for CSV uploads)
    let successCount = 0;
    let failCount = 0;

    for (let i = 1; i < coords.length; i++) {
      try {
        const coord = coords[i];
        const body: any = { 
          lat: coord.lat, 
          lon: coord.lon,
          sample_id: coord.sample_id 
        };
        
        if (coord.imageData) {
          body.imageData = coord.imageData;
        }

        const { data, error } = await supabase.functions.invoke('verify-solar', {
          body
        });

        if (!error && data) {
          setAllResults(prev => [...prev, data]);
          successCount++;
        } else {
          failCount++;
        }
      } catch (err) {
        console.error('Bulk verification error:', err);
        failCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`Completed ${successCount} verifications successfully`);
    }
    if (failCount > 0) {
      toast.error(`${failCount} verifications failed`);
    }
  };

  // Calculate IoU comparison
  const comparison = useMemo((): AnnotationComparison | null => {
    if (!result?.detection_polygons || groundTruthAnnotations.length === 0) {
      return null;
    }

    try {
      // Combine all AI detection polygons
      const aiPolygons = result.detection_polygons.map(p => 
        turf.polygon(p.coordinates)
      );
      const aiUnion = aiPolygons.length > 1 
        ? turf.union(turf.featureCollection(aiPolygons))
        : aiPolygons[0];
      
      // Combine all ground truth polygons
      const gtPolygons = groundTruthAnnotations.map(a => 
        turf.polygon(a.coordinates)
      );
      const gtUnion = gtPolygons.length > 1
        ? turf.union(turf.featureCollection(gtPolygons))
        : gtPolygons[0];

      if (!aiUnion || !gtUnion) return null;

      const aiArea = turf.area(aiUnion);
      const gtArea = turf.area(gtUnion);

      // Calculate intersection
      const intersection = turf.intersect(turf.featureCollection([aiUnion, gtUnion]));
      const overlapArea = intersection ? turf.area(intersection) : 0;

      // IoU = Intersection / Union
      const unionArea = aiArea + gtArea - overlapArea;
      const iou = overlapArea / unionArea;

      let agreement_status: 'match' | 'partial' | 'mismatch' | 'missing';
      if (iou > 0.7) agreement_status = 'match';
      else if (iou > 0.4) agreement_status = 'partial';
      else agreement_status = 'mismatch';

      return {
        ai_area_sqm: aiArea,
        ground_truth_area_sqm: gtArea,
        iou_score: iou,
        agreement_status,
        overlap_area_sqm: overlapArea
      };
    } catch (err) {
      console.error('Comparison calculation error:', err);
      return null;
    }
  }, [result, groundTruthAnnotations]);

  const handleToggleAnnotationMode = () => {
    setAnnotationMode(!annotationMode);
    if (annotationMode) {
      toast.success("Annotation mode disabled");
    } else {
      toast.success("Annotation mode enabled - draw on the map");
    }
  };

  const handleAnnotationsChange = (annotations: GroundTruthAnnotation[]) => {
    setGroundTruthAnnotations(annotations);
  };

  const handleUpdateAnnotation = (id: string, updates: Partial<GroundTruthAnnotation>) => {
    setGroundTruthAnnotations(prev => 
      prev.map(a => a.id === id ? { ...a, ...updates } : a)
    );
  };

  const handleDeleteAnnotation = (id: string) => {
    setGroundTruthAnnotations(prev => prev.filter(a => a.id !== id));
    toast.success("Annotation deleted");
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

  // Two-screen mode: show input OR results
  const showResults = coordinates !== null;

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
        /* Screen 2: Results View (Split Pane) */
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Left Pane - Map View (60-65% width) */}
          <div className="lg:w-[63%] h-[50vh] lg:h-full relative border-b lg:border-b-0 lg:border-r border-border">
            <MapView 
              coordinates={coordinates} 
              detectionPolygons={result?.detection_polygons}
              annotationMode={annotationMode}
              onAnnotationsChange={handleAnnotationsChange}
              groundTruthAnnotations={groundTruthAnnotations}
              showComparison={showComparison}
              onToggleComparison={() => setShowComparison(!showComparison)}
            />
          </div>

          {/* Right Pane - Results (35-40% width) */}
          <div className="lg:w-[37%] h-[50vh] lg:h-full overflow-y-auto bg-background">
            <ResultsPanel 
              result={result} 
              isLoading={isVerifying}
              annotationMode={annotationMode}
              onToggleAnnotationMode={handleToggleAnnotationMode}
              groundTruthAnnotations={groundTruthAnnotations}
              comparison={comparison}
              onUpdateAnnotation={handleUpdateAnnotation}
              onDeleteAnnotation={handleDeleteAnnotation}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;
