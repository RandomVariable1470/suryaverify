import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileText, X } from "lucide-react";
import { toast } from "sonner";

interface BulkUploadDialogProps {
  onUpload: (coordinates: Array<{ lat: number; lon: number; sample_id?: string }>) => void;
}

const BulkUploadDialog = ({ onUpload }: BulkUploadDialogProps) => {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (selectedFile: File) => {
    if (!selectedFile.name.endsWith('.csv')) {
      toast.error("Please upload a CSV file");
      return;
    }
    setFile(selectedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const parseCSV = (text: string): Array<{ lat: number; lon: number; sample_id?: string }> => {
    const lines = text.trim().split('\n');
    const coordinates: Array<{ lat: number; lon: number; sample_id?: string }> = [];

    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const parts = line.split(',').map(p => p.trim());
      
      // Support formats: "lat,lon" or "sample_id,lat,lon"
      let lat: number, lon: number, sample_id: string | undefined;
      
      if (parts.length === 2) {
        lat = parseFloat(parts[0]);
        lon = parseFloat(parts[1]);
      } else if (parts.length >= 3) {
        sample_id = parts[0];
        lat = parseFloat(parts[1]);
        lon = parseFloat(parts[2]);
      } else {
        continue;
      }

      if (!isNaN(lat) && !isNaN(lon)) {
        // Validate India bounds
        if (lat >= 8 && lat <= 37 && lon >= 68 && lon <= 97) {
          coordinates.push({ lat, lon, sample_id });
        }
      }
    }

    return coordinates;
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select a file");
      return;
    }

    try {
      const text = await file.text();
      const coordinates = parseCSV(text);

      if (coordinates.length === 0) {
        toast.error("No valid coordinates found in CSV");
        return;
      }

      if (coordinates.length > 100) {
        toast.error("Maximum 100 coordinates per upload");
        return;
      }

      onUpload(coordinates);
      toast.success(`Loaded ${coordinates.length} locations for verification`);
      setOpen(false);
      setFile(null);
    } catch (error) {
      console.error('CSV parse error:', error);
      toast.error("Failed to parse CSV file");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Upload className="w-4 h-4" />
          <span className="hidden sm:inline">Bulk Upload</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bulk Upload Coordinates</DialogTitle>
          <DialogDescription>
            Upload a CSV file with coordinates to verify multiple locations at once.
            <br />
            Format: <code className="text-xs bg-muted px-1 py-0.5 rounded">lat,lon</code> or <code className="text-xs bg-muted px-1 py-0.5 rounded">sample_id,lat,lon</code>
          </DialogDescription>
        </DialogHeader>

        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging ? 'border-primary bg-primary/5' : 'border-border'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
          />

          {!file ? (
            <>
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium mb-1">Drop CSV file here</p>
              <p className="text-xs text-muted-foreground mb-4">or</p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                Browse Files
              </Button>
            </>
          ) : (
            <div className="flex items-center justify-between bg-muted p-3 rounded">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium">{file.name}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFile(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              setOpen(false);
              setFile(null);
            }}
          >
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={handleUpload}
            disabled={!file}
          >
            Upload & Process
          </Button>
        </div>

        <div className="text-xs text-muted-foreground border-t pt-3 space-y-1">
          <p>• Maximum 100 locations per upload</p>
          <p>• Coordinates must be within India (8-37°N, 68-97°E)</p>
          <p>• First row should be header (will be skipped)</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BulkUploadDialog;
