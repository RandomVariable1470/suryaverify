import { useState } from "react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { VerificationResult } from "@/types/verification";
import { CheckCircle2, XCircle, AlertCircle, Download, Eye, Loader2, ChevronDown, ChevronUp, Info } from "lucide-react";
import { Separator } from "./ui/separator";
import { toast } from "sonner";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface ResultsPanelProps {
  result: VerificationResult | null;
  isLoading: boolean;
}

const ResultsPanel = ({ result, isLoading }: ResultsPanelProps) => {
  const [qcOpen, setQcOpen] = useState(true);
  const [metadataOpen, setMetadataOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center max-w-sm">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-primary/20 rounded-full" />
            <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Eye className="w-8 h-8 text-primary animate-pulse" />
            </div>
          </div>
          <h3 className="font-bold text-lg mb-2 text-foreground">Analyzing Satellite Imagery</h3>
          <p className="text-sm text-muted-foreground mb-3">Running AI verification pipeline...</p>
          <div className="w-full bg-muted/50 h-1.5 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary to-accent animate-progress" />
          </div>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center max-w-md animate-fade-in">
          <div className="w-20 h-20 rounded-2xl bg-muted/30 flex items-center justify-center mx-auto mb-5 border-2 border-dashed border-border">
            <Eye className="w-10 h-10 text-muted-foreground" />
          </div>
          <h3 className="font-bold text-xl mb-2 text-foreground">Awaiting Verification</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Enter coordinates and click <span className="font-semibold text-primary">"Run Verification"</span> to begin remote rooftop assessment
          </p>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "VERIFIABLE":
        return "bg-success text-success-foreground";
      case "NOT_VERIFIABLE":
        return "bg-destructive text-destructive-foreground";
      default:
        return "bg-warning text-warning-foreground";
    }
  };

  const getStatusIcon = () => {
    if (result.qc_status === "VERIFIABLE" && result.has_solar) {
      return <CheckCircle2 className="w-5 h-5" />;
    } else if (result.qc_status === "NOT_VERIFIABLE") {
      return <AlertCircle className="w-5 h-5" />;
    } else {
      return <XCircle className="w-5 h-5" />;
    }
  };

  return (
    <div className="h-full overflow-auto">
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="animate-fade-in">
          <h2 className="text-2xl font-bold text-foreground mb-1">Verification Results</h2>
          <p className="text-sm text-muted-foreground font-mono">Sample ID: #{result.sample_id}</p>
        </div>

        {/* 1️⃣ Detection Status Card */}
        <Card className="p-6 border-2 border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 animate-slide-up" style={{ animationDelay: '100ms' }}>
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${result.has_solar ? 'bg-success/10 animate-pulse-ring' : 'bg-muted/50'}`}>
                {getStatusIcon()}
              </div>
              <div>
                <h3 className="font-bold text-xl mb-1 text-foreground">
                  {result.has_solar ? "Solar Panels Detected" : "No Solar Panels Found"}
                </h3>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <span className="font-semibold">Confidence:</span>
                  <span className="font-mono text-base font-bold text-primary">{(result.confidence * 100).toFixed(1)}%</span>
                </p>
              </div>
            </div>
            <Badge className={`${getStatusColor(result.qc_status)} text-xs px-3 py-1 font-semibold shadow-sm`}>
              {result.qc_status}
            </Badge>
          </div>

          {result.has_solar && (
            <>
              <Separator className="my-5" />
              
              {/* Metrics Grid */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">Panel Count</p>
                  <p className="text-3xl font-bold text-foreground">{result.panel_count_est}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">units</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">PV Area</p>
                  <p className="text-3xl font-bold text-foreground">{result.pv_area_sqm_est.toFixed(1)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">m²</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">Capacity</p>
                  <p className="text-3xl font-bold text-primary">{result.capacity_kw_est.toFixed(1)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">kW</p>
                </div>
              </div>
            </>
          )}
        </Card>

        {/* 2️⃣ Quality Control Notes */}
        <Collapsible open={qcOpen} onOpenChange={setQcOpen}>
          <Card className="border-border/50 shadow-md hover:shadow-lg transition-all duration-300 animate-slide-up overflow-hidden" style={{ animationDelay: '200ms' }}>
            <CollapsibleTrigger className="w-full p-5 flex items-center justify-between hover:bg-muted/30 transition-colors">
              <h4 className="font-bold text-base flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <AlertCircle className="w-4 h-4 text-primary" />
                </div>
                Quality Control Notes
              </h4>
              {qcOpen ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-5 pb-5">
                <Separator className="mb-4" />
                <ul className="space-y-3">
                  {result.qc_notes.map((note, index) => (
                    <li key={index} className="text-sm text-foreground/90 flex items-start gap-3 p-2 rounded-lg hover:bg-muted/20 transition-colors">
                      <span className="text-success mt-0.5 flex-shrink-0">
                        <CheckCircle2 className="w-4 h-4" />
                      </span>
                      <span className="leading-relaxed">{note}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* 3️⃣ Explainability Artifact */}
        <Card className="p-5 border-border/50 shadow-md hover:shadow-lg transition-all duration-300 animate-slide-up" style={{ animationDelay: '300ms' }}>
          <h4 className="font-bold text-base mb-3 flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-accent/10">
              <Eye className="w-4 h-4 text-accent" />
            </div>
            Detection Overlay
          </h4>
          {result.detection_polygons && result.detection_polygons.length > 0 ? (
            <div className="space-y-3">
              <div className="relative aspect-video bg-muted/30 rounded-lg overflow-hidden border border-accent/30">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-3">
                      <Eye className="w-8 h-8 text-accent" />
                    </div>
                    <p className="text-sm font-semibold text-foreground mb-1">
                      {result.detection_polygons.length} detection zone{result.detection_polygons.length > 1 ? 's' : ''} identified
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Toggle "PV Mask" on the map to view overlays
                    </p>
                  </div>
                </div>
              </div>
              <div className="text-xs text-muted-foreground bg-muted/20 p-3 rounded-lg">
                <p className="font-semibold mb-1">Detection Zones:</p>
                {result.detection_polygons.map((poly, idx) => (
                  <p key={idx}>
                    • Zone {idx + 1}: {(poly.confidence * 100).toFixed(1)}% confidence
                  </p>
                ))}
              </div>
            </div>
          ) : (
            <div className="relative aspect-video bg-muted/30 rounded-lg overflow-hidden border border-border/50">
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-sm text-muted-foreground">No detection zones identified</p>
              </div>
            </div>
          )}
        </Card>

        {/* 4️⃣ Image Metadata */}
        <Collapsible open={metadataOpen} onOpenChange={setMetadataOpen}>
          <Card className="border-border/50 shadow-md hover:shadow-lg transition-all duration-300 animate-slide-up overflow-hidden" style={{ animationDelay: '400ms' }}>
            <CollapsibleTrigger className="w-full p-5 flex items-center justify-between hover:bg-muted/30 transition-colors">
              <h4 className="font-bold text-base flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-muted">
                  <Info className="w-4 h-4 text-foreground" />
                </div>
                Image Metadata
              </h4>
              {metadataOpen ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-5 pb-5">
                <Separator className="mb-4" />
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center p-2 rounded-lg hover:bg-muted/20 transition-colors">
                    <span className="text-muted-foreground font-medium">Source:</span>
                    <span className="font-semibold text-foreground">{result.image_metadata.source}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded-lg hover:bg-muted/20 transition-colors">
                    <span className="text-muted-foreground font-medium">Zoom Level:</span>
                    <span className="font-mono font-bold text-foreground">{result.image_metadata.zoom}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded-lg hover:bg-muted/20 transition-colors">
                    <span className="text-muted-foreground font-medium">Coordinates:</span>
                    <span className="font-mono text-xs font-semibold text-foreground">{result.lat.toFixed(6)}, {result.lon.toFixed(6)}</span>
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Actions */}
        <div className="flex flex-col gap-3 animate-fade-in" style={{ animationDelay: '500ms' }}>
          <div className="flex gap-3">
            <Button 
              variant="default" 
              className="flex-1 gap-2 shadow-md hover:shadow-lg active:scale-[0.98] transition-all"
              onClick={() => {
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
              }}
            >
              <Download className="w-4 h-4" />
              Download JSON
            </Button>
          </div>
          
          {result.detection_polygons && result.detection_polygons.length > 0 && (
            <Button 
              variant="outline" 
              className="w-full gap-2 border-accent/50 hover:bg-accent/10 hover:border-accent transition-all"
              onClick={() => {
                // Create GeoJSON FeatureCollection
                const geojson = {
                  type: "FeatureCollection",
                  metadata: {
                    sample_id: result.sample_id,
                    center_lat: result.lat,
                    center_lon: result.lon,
                    verification_date: new Date().toISOString(),
                    has_solar: result.has_solar,
                    overall_confidence: result.confidence,
                    panel_count: result.panel_count_est,
                    pv_area_sqm: result.pv_area_sqm_est,
                    capacity_kw: result.capacity_kw_est,
                    qc_status: result.qc_status,
                    source: "SuryaVerify - PM Surya Ghar Verification System",
                    imagery_source: result.image_metadata.source,
                    imagery_zoom: result.image_metadata.zoom
                  },
                  features: result.detection_polygons.map((polygon, idx) => ({
                    type: "Feature",
                    id: `detection_${result.sample_id}_${idx + 1}`,
                    geometry: {
                      type: polygon.type,
                      coordinates: polygon.coordinates
                    },
                    properties: {
                      zone_id: idx + 1,
                      confidence: polygon.confidence,
                      confidence_percent: `${(polygon.confidence * 100).toFixed(1)}%`,
                      detection_method: "AI-powered satellite imagery analysis",
                      model: "Lovable AI - Google Gemini 2.5 Pro",
                      verification_status: result.qc_status
                    }
                  }))
                };

                const geojsonStr = JSON.stringify(geojson, null, 2);
                const blob = new Blob([geojsonStr], { type: 'application/geo+json' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `solar_detection_${result.sample_id}_${result.lat.toFixed(6)}_${result.lon.toFixed(6)}.geojson`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                
                toast.success("GeoJSON exported successfully!");
              }}
            >
              <Download className="w-4 h-4" />
              Export GeoJSON for GIS
            </Button>
          )}
        </div>

        {/* Attribution & Legal Notice */}
        <div className="text-xs text-muted-foreground/80 border-t border-border/30 pt-4 pb-2 space-y-1.5 leading-relaxed animate-fade-in" style={{ animationDelay: '600ms' }}>
          <p className="flex items-start gap-2">
            <span className="text-warning mt-0.5">⚠️</span>
            <span>Imagery © Mapbox — Prototype demonstration only — Not final audit imagery</span>
          </p>
          <p className="flex items-start gap-2 ml-5">
            <span>Capacity estimates assume 0.2 kW per m² panel area</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResultsPanel;
