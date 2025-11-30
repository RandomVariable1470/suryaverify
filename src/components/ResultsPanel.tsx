import { CheckCircle2, XCircle, AlertCircle, Download, MapPin, Image as ImageIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { VerificationResult } from "@/types/verification";
import AnimatedNumber from "./AnimatedNumber";
import { toast } from "sonner";

interface ResultsPanelProps {
  result: VerificationResult | null;
  isLoading: boolean;
}

const ResultsPanel = ({ result, isLoading }: ResultsPanelProps) => {
  const handleExportResult = () => {
    if (!result) return;

    const hasDetectionPolygons = result.detection_polygons && result.detection_polygons.length > 0;
    
    if (hasDetectionPolygons) {
      const features: any[] = [];
      
      result.detection_polygons!.forEach((polygon, idx) => {
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
            verification_type: "solar_detection"
          }
        });
      });

      const geojson = {
        type: "FeatureCollection",
        metadata: {
          export_date: new Date().toISOString(),
          sample_id: result.sample_id,
          source: "SuryaVerify"
        },
        features
      };

      const geojsonStr = JSON.stringify(geojson, null, 2);
      const blob = new Blob([geojsonStr], { type: 'application/geo+json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `verification_${result.sample_id}.geojson`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Audit package exported");
    } else {
      const dataStr = JSON.stringify(result, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `verification_${result.sample_id}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Result exported");
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="text-center space-y-4 animate-fade-in">
          <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin mx-auto" />
          <p className="text-muted-foreground">Analyzing satellite imagery...</p>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="text-center space-y-2 text-muted-foreground max-w-xs">
          <MapPin className="w-12 h-12 mx-auto opacity-50" />
          <p className="text-sm">Enter coordinates and run verification to see results</p>
        </div>
      </div>
    );
  }

  const isVerifiable = result.qc_status === "VERIFIABLE";
  const hasSolar = result.has_solar;

  return (
    <div className="p-6 space-y-4">
      {/* Card 1: Verification Summary */}
      <Card className="shadow-[0_2px_8px_hsla(150,15%,20%,0.08)] dark:shadow-[0_2px_8px_hsla(0,0%,0%,0.3)] border border-border animate-fade-in rounded-2xl">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {hasSolar ? (
                <div className="p-2 rounded-xl bg-success/10">
                  <CheckCircle2 className="w-8 h-8 text-success" />
                </div>
              ) : (
                <div className="p-2 rounded-xl bg-warning/10">
                  <XCircle className="w-8 h-8 text-warning" />
                </div>
              )}
              <div>
                <CardTitle className="text-xl">
                  {hasSolar ? "Solar Panels Detected" : "No Evidence of Solar"}
                </CardTitle>
                <CardDescription className="mt-1">
                  ID: {result.sample_id}
                </CardDescription>
              </div>
            </div>
            <Badge variant={isVerifiable ? "default" : "secondary"} className="ml-2">
              {result.qc_status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-xl">
            <span className="text-sm font-medium text-muted-foreground">Confidence</span>
            <span className="text-2xl font-bold text-foreground">
              <AnimatedNumber value={result.confidence * 100} decimals={1} suffix="%" />
            </span>
          </div>
          
          {hasSolar && (
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-secondary/30 rounded-xl">
                <p className="text-xs text-muted-foreground mb-1">Panels</p>
                <p className="text-lg font-bold text-foreground">
                  <AnimatedNumber value={result.panel_count_est} decimals={0} />
                </p>
              </div>
              <div className="text-center p-3 bg-secondary/30 rounded-xl">
                <p className="text-xs text-muted-foreground mb-1">Area (m²)</p>
                <p className="text-lg font-bold text-foreground">
                  <AnimatedNumber value={result.pv_area_sqm_est} decimals={1} />
                </p>
              </div>
              <div className="text-center p-3 bg-secondary/30 rounded-xl">
                <p className="text-xs text-muted-foreground mb-1">Capacity (kW)</p>
                <p className="text-lg font-bold text-foreground">
                  <AnimatedNumber value={result.capacity_kw_est} decimals={2} />
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Card 2: QC Notes */}
      {result.qc_notes && result.qc_notes.length > 0 && (
        <Card className="shadow-[0_2px_8px_hsla(150,15%,20%,0.08)] dark:shadow-[0_2px_8px_hsla(0,0%,0%,0.3)] border border-border animate-fade-in rounded-2xl" style={{ animationDelay: "0.1s" }}>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Quality Check Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {result.qc_notes.map((note, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <span className="text-primary mt-0.5">•</span>
                  <span className="text-muted-foreground">{note}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Card 3: Explainability Overlay */}
      {result.detection_polygons && result.detection_polygons.length > 0 && (
        <Card className="shadow-[0_2px_8px_hsla(150,15%,20%,0.08)] dark:shadow-[0_2px_8px_hsla(0,0%,0%,0.3)] border border-border animate-fade-in rounded-2xl" style={{ animationDelay: "0.2s" }}>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ImageIcon className="w-5 h-5" />
              Detection Overlay
            </CardTitle>
            <CardDescription>
              {result.detection_polygons.length} zone{result.detection_polygons.length !== 1 ? 's' : ''} identified on map
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              Toggle "PV Mask" on the map to view detection boundaries overlaid on satellite imagery.
            </div>
          </CardContent>
        </Card>
      )}

      {/* Card 4: Image Metadata */}
      <Card className="shadow-[0_2px_8px_hsla(150,15%,20%,0.08)] dark:shadow-[0_2px_8px_hsla(0,0%,0%,0.3)] border border-border animate-fade-in rounded-2xl" style={{ animationDelay: "0.3s" }}>
        <CardHeader>
          <CardTitle className="text-lg">Image Metadata</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">Source</span>
              <span className="font-medium">{result.image_metadata?.source || "Mapbox Satellite"}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">Zoom Level</span>
              <span className="font-medium">{result.image_metadata?.zoom || 20}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Coordinates</span>
              <span className="font-mono text-xs">{result.lat.toFixed(5)}, {result.lon.toFixed(5)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 5: Download Audit Package */}
      <Card className="shadow-[0_2px_8px_hsla(150,15%,20%,0.08)] dark:shadow-[0_2px_8px_hsla(0,0%,0%,0.3)] border border-border animate-fade-in rounded-2xl" style={{ animationDelay: "0.4s" }}>
        <CardContent className="pt-6">
          <Button 
            onClick={handleExportResult}
            variant="outline"
            className="w-full gap-2"
          >
            <Download className="w-4 h-4" />
            Download Audit Package
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResultsPanel;
