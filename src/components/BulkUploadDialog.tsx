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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, FileText, X, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

interface BulkUploadDialogProps {
  onUpload: (coordinates: Array<{ lat: number; lon: number; sample_id?: string; imageData?: string }>) => void;
}

const BulkUploadDialog = ({ onUpload }: BulkUploadDialogProps) => {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'csv' | 'image'>('csv');
  const [file, setFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageLat, setImageLat] = useState('');
  const [imageLon, setImageLon] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (selectedFile: File) => {
    if (mode === 'csv') {
      if (!selectedFile.name.endsWith('.csv')) {
        toast.error("Please upload a CSV file");
        return;
      }
      setFile(selectedFile);
    } else {
      const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
      if (!validTypes.includes(selectedFile.type)) {
        toast.error("Please upload a PNG, JPG, or WEBP image");
        return;
      }
      setImageFile(selectedFile);
      
      // Generate preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
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
    if (mode === 'csv') {
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
    } else {
      // Image mode - analyze uploaded image
      if (!imageFile || !imageLat || !imageLon) {
        toast.error("Please provide image and coordinates");
        return;
      }

      const lat = parseFloat(imageLat);
      const lon = parseFloat(imageLon);

      if (isNaN(lat) || isNaN(lon)) {
        toast.error("Invalid coordinates");
        return;
      }

      if (lat < 8 || lat > 37 || lon < 68 || lon > 97) {
        toast.error("Coordinates must be within India (8-37°N, 68-97°E)");
        return;
      }

      // Read image as base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const imageData = e.target?.result as string;
        
        // Create a coordinate object with the image data
        // This will be sent to the verify-solar edge function
        onUpload([{ lat, lon, imageData } as any]);
        toast.success("Analyzing uploaded image...");
        setOpen(false);
        resetImageMode();
      };
      
      reader.onerror = () => {
        toast.error("Failed to read image file");
      };
      
      reader.readAsDataURL(imageFile);
      return; // Wait for async operation
    }
  };

  const resetImageMode = () => {
    setImageFile(null);
    setImagePreview(null);
    setImageLat('');
    setImageLon('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Upload className="w-4 h-4" />
          <span className="hidden sm:inline">Bulk Upload</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload for Verification</DialogTitle>
          <DialogDescription>
            Upload coordinates via CSV or analyze satellite imagery directly
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as 'csv' | 'image')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="csv">CSV Coordinates</TabsTrigger>
            <TabsTrigger value="image">Satellite Image</TabsTrigger>
          </TabsList>

          <TabsContent value="csv" className="space-y-4">

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

            <div className="text-xs text-muted-foreground border-t pt-3 space-y-1">
              <p><strong>Format:</strong> <code className="bg-muted px-1 py-0.5 rounded">lat,lon</code> or <code className="bg-muted px-1 py-0.5 rounded">sample_id,lat,lon</code></p>
              <p>• Maximum 100 locations per upload</p>
              <p>• Coordinates must be within India (8-37°N, 68-97°E)</p>
              <p>• First row should be header (will be skipped)</p>
            </div>
          </TabsContent>

          <TabsContent value="image" className="space-y-4">
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                isDragging ? 'border-primary bg-primary/5' : 'border-border'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <input
                ref={imageInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              />

              {!imagePreview ? (
                <>
                  <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm font-medium mb-1">Drop satellite image here</p>
                  <p className="text-xs text-muted-foreground mb-4">PNG, JPG, or WEBP</p>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => imageInputRef.current?.click()}
                  >
                    Browse Images
                  </Button>
                </>
              ) : (
                <div className="space-y-3">
                  <div className="relative rounded-lg overflow-hidden border border-border bg-muted">
                    <img 
                      src={imagePreview} 
                      alt="Preview" 
                      className="w-full h-48 object-cover"
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={resetImageMode}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <ImageIcon className="w-4 h-4 text-primary" />
                    <span className="font-medium">{imageFile?.name}</span>
                    <span className="text-muted-foreground">
                      ({(imageFile!.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                </div>
              )}
            </div>

            {imagePreview && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="lat" className="text-xs">Latitude</Label>
                    <Input
                      id="lat"
                      type="number"
                      step="0.000001"
                      placeholder="e.g. 28.6139"
                      value={imageLat}
                      onChange={(e) => setImageLat(e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="lon" className="text-xs">Longitude</Label>
                    <Input
                      id="lon"
                      type="number"
                      step="0.000001"
                      placeholder="e.g. 77.2090"
                      value={imageLon}
                      onChange={(e) => setImageLon(e.target.value)}
                      className="h-9"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Provide coordinates for this satellite image location
                </p>
              </div>
            )}

            <div className="text-xs text-muted-foreground border-t pt-3 space-y-1">
              <p>• Upload existing satellite imagery for analysis</p>
              <p>• Supported formats: PNG, JPG, WEBP</p>
              <p>• Provide lat/lon coordinates for the image center</p>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              setOpen(false);
              setFile(null);
              resetImageMode();
            }}
          >
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={handleUpload}
            disabled={mode === 'csv' ? !file : !imageFile || !imageLat || !imageLon}
          >
            {mode === 'csv' ? 'Upload & Process' : 'Analyze Image'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BulkUploadDialog;
