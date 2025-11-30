import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { VerificationResult } from "@/types/verification";
import { CheckCircle2, XCircle, AlertCircle, Download, Eye, Loader2 } from "lucide-react";
import { Separator } from "./ui/separator";

interface ResultsPanelProps {
  result: VerificationResult | null;
  isLoading: boolean;
}

const ResultsPanel = ({ result, isLoading }: ResultsPanelProps) => {
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary mx-auto mb-4 animate-spin" />
          <h3 className="font-semibold text-lg mb-2">Analyzing Satellite Imagery</h3>
          <p className="text-sm text-muted-foreground">Running AI verification pipeline...</p>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Eye className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg mb-2">Awaiting Verification</h3>
          <p className="text-sm text-muted-foreground">
            Enter coordinates and click "Run Verification" to begin remote assessment
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
    <div className="h-full overflow-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-1">Verification Results</h2>
        <p className="text-sm text-muted-foreground">Sample ID: {result.sample_id}</p>
      </div>

      {/* Detection Status Card */}
      <Card className="p-5 border-2">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${result.has_solar ? 'bg-success/10' : 'bg-muted'}`}>
              {getStatusIcon()}
            </div>
            <div>
              <h3 className="font-semibold text-lg">
                {result.has_solar ? "Solar Panels Detected" : "No Solar Panels Found"}
              </h3>
              <p className="text-sm text-muted-foreground">
                Confidence: {(result.confidence * 100).toFixed(1)}%
              </p>
            </div>
          </div>
          <Badge className={getStatusColor(result.qc_status)}>
            {result.qc_status}
          </Badge>
        </div>

        <Separator className="my-4" />

        {/* Metrics Grid */}
        {result.has_solar && (
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Panel Count</p>
              <p className="text-2xl font-bold text-foreground">{result.panel_count_est}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">PV Area</p>
              <p className="text-2xl font-bold text-foreground">{result.pv_area_sqm_est.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">m²</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Capacity</p>
              <p className="text-2xl font-bold text-foreground">{result.capacity_kw_est.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">kW</p>
            </div>
          </div>
        )}
      </Card>

      {/* QC Notes */}
      <Card className="p-5">
        <h4 className="font-semibold mb-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-primary" />
          Quality Control Notes
        </h4>
        <ul className="space-y-2">
          {result.qc_notes.map((note, index) => (
            <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>{note}</span>
            </li>
          ))}
        </ul>
      </Card>

      {/* Image Metadata */}
      <Card className="p-5 bg-muted/50">
        <h4 className="font-semibold mb-3 text-sm">Image Metadata</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Source:</span>
            <span className="font-medium">{result.image_metadata.source}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Zoom Level:</span>
            <span className="font-medium">{result.image_metadata.zoom}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Coordinates:</span>
            <span className="font-mono text-xs">{result.lat.toFixed(6)}, {result.lon.toFixed(6)}</span>
          </div>
        </div>
      </Card>

      {/* Actions */}
      <div className="flex gap-2">
        <Button 
          variant="outline" 
          className="flex-1 gap-2"
          onClick={() => {
            // Placeholder for overlay view
            alert('Overlay visualization coming soon');
          }}
        >
          <Eye className="w-4 h-4" />
          View Overlay
        </Button>
        <Button 
          variant="default" 
          className="flex-1 gap-2"
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

      {/* Attribution */}
      <div className="text-xs text-muted-foreground border-t border-border pt-4">
        <p>⚠️ Data licensed from Mapbox — for prototype demonstration only</p>
        <p className="mt-1">Estimates use assumption: 0.2 kW per m² panel area</p>
      </div>
    </div>
  );
};

export default ResultsPanel;
