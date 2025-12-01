import { useState, useRef } from "react";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Label } from "./ui/label";
import { MapPin, Loader2, FileText, Upload, X, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

interface CoordinateInputProps {
  onVerify: (lat: number, lon: number) => void;
  onBulkUpload: (coordinates: Array<{ lat: number; lon: number; sample_id?: string; imageData?: string }>) => void;
  isLoading: boolean;
}

const CoordinateInput = ({ onVerify, onBulkUpload, isLoading }: CoordinateInputProps) => {
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [uploadMode, setUploadMode] = useState<'csv' | 'image'>('csv');
  const [file, setFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageLat, setImageLat] = useState('');
  const [imageLon, setImageLon] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [activeTab, setActiveTab] = useState("manual");
  const csvInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);

    if (isNaN(latitude) || isNaN(longitude)) {
      toast.error("Please enter valid coordinates");
      return;
    }

    if (latitude < 8 || latitude > 37 || longitude < 68 || longitude > 97) {
      toast.error("Coordinates must be within India");
      return;
    }

    onVerify(latitude, longitude);
  };

  // File upload handlers
  const handleFileSelect = (selectedFile: File) => {
    if (uploadMode === 'csv') {
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

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const parts = line.split(',').map(p => p.trim());
      
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
        if (lat >= 8 && lat <= 37 && lon >= 68 && lon <= 97) {
          coordinates.push({ lat, lon, sample_id });
        }
      }
    }

    return coordinates;
  };

  const handleUpload = async () => {
    if (uploadMode === 'csv') {
      if (!file) {
        toast.error("Please select a CSV file");
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

        onBulkUpload(coordinates);
        toast.success(`Loaded ${coordinates.length} locations for verification`);
        setFile(null);
      } catch (error) {
        console.error('CSV parse error:', error);
        toast.error("Failed to parse CSV file");
      }
    } else {
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

      const reader = new FileReader();
      reader.onload = async (e) => {
        const imageData = e.target?.result as string;
        onBulkUpload([{ lat, lon, imageData } as any]);
        toast.success("Analyzing uploaded image...");
        resetImageMode();
      };
      
      reader.onerror = () => {
        toast.error("Failed to read image file");
      };
      
      reader.readAsDataURL(imageFile);
    }
  };

  const resetImageMode = () => {
    setImageFile(null);
    setImagePreview(null);
    setImageLat('');
    setImageLon('');
  };

  return (
    <Card className="p-8 shadow-[0_2px_8px_hsla(150,15%,20%,0.08)] border border-border rounded-2xl animate-fade-in w-full max-w-2xl">
      <div className="text-center space-y-2 mb-6">
        <div className="inline-flex p-3 rounded-xl bg-primary/10 mb-2">
          <MapPin className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Solar Verification</h2>
        <p className="text-sm text-muted-foreground">Enter coordinates or upload files</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="manual">Manual Entry</TabsTrigger>
          <TabsTrigger value="upload">Upload Files</TabsTrigger>
        </TabsList>

        {/* Manual Entry Tab */}
        <TabsContent value="manual">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-foreground mb-2 block">
                  Latitude
                </label>
                <Input
                  type="number"
                  step="any"
                  placeholder="28.6448"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  className="h-11 font-mono border-border focus:border-primary transition-colors"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-foreground mb-2 block">
                  Longitude
                </label>
                <Input
                  type="number"
                  step="any"
                  placeholder="77.2167"
                  value={lon}
                  onChange={(e) => setLon(e.target.value)}
                  className="h-11 font-mono border-border focus:border-primary transition-colors"
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 text-base font-semibold shadow-sm hover:shadow-md active:scale-[0.98] transition-all duration-200"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Run Verification"
              )}
            </Button>
          </form>
        </TabsContent>

        {/* Upload Files Tab */}
        <TabsContent value="upload">
          <div className="space-y-4">
            <Tabs value={uploadMode} onValueChange={(v) => setUploadMode(v as 'csv' | 'image')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="csv">CSV Coordinates</TabsTrigger>
                <TabsTrigger value="image">Satellite Image</TabsTrigger>
              </TabsList>

              {/* CSV Upload */}
              <TabsContent value="csv" className="space-y-4 mt-4">
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    isDragging ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                >
                  <input
                    ref={csvInputRef}
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
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => csvInputRef.current?.click()}
                      >
                        <Upload className="w-4 h-4 mr-2" />
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
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setFile(null)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>

                <div className="text-xs text-muted-foreground space-y-1 bg-muted/30 p-3 rounded-lg">
                  <p><strong>Format:</strong> <code className="bg-background px-1 py-0.5 rounded">lat,lon</code> or <code className="bg-background px-1 py-0.5 rounded">sample_id,lat,lon</code></p>
                  <p>• Maximum 100 locations per upload</p>
                  <p>• Coordinates must be within India (8-37°N, 68-97°E)</p>
                </div>
              </TabsContent>

              {/* Image Upload */}
              <TabsContent value="image" className="space-y-4 mt-4">
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
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => imageInputRef.current?.click()}
                      >
                        <Upload className="w-4 h-4 mr-2" />
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
                          type="button"
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
                        <Label htmlFor="img-lat" className="text-xs">Latitude</Label>
                        <Input
                          id="img-lat"
                          type="number"
                          step="0.000001"
                          placeholder="e.g. 28.6139"
                          value={imageLat}
                          onChange={(e) => setImageLat(e.target.value)}
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="img-lon" className="text-xs">Longitude</Label>
                        <Input
                          id="img-lon"
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

                <div className="text-xs text-muted-foreground space-y-1 bg-muted/30 p-3 rounded-lg">
                  <p>• Upload existing satellite imagery for analysis</p>
                  <p>• Supported formats: PNG, JPG, WEBP</p>
                  <p>• Provide lat/lon coordinates for the image center</p>
                </div>
              </TabsContent>
            </Tabs>

            <Button
              type="button"
              onClick={handleUpload}
              disabled={uploadMode === 'csv' ? !file : !imageFile || !imageLat || !imageLon}
              className="w-full h-12 text-base font-semibold"
            >
              {uploadMode === 'csv' ? (
                <>
                  <Upload className="w-5 h-5 mr-2" />
                  Upload & Process CSV
                </>
              ) : (
                <>
                  <ImageIcon className="w-5 h-5 mr-2" />
                  Analyze Image
                </>
              )}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
};

export default CoordinateInput;
