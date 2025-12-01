import { useState, useRef, useEffect } from "react";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Label } from "./ui/label";
import { MapPin, Loader2, FileText, Upload, X, Image as ImageIcon, Map } from "lucide-react";
import { toast } from "sonner";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { supabase } from "@/integrations/supabase/client";

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
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);

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

  // Initialize map in background for instant loading
  useEffect(() => {
    let loadTimeout: NodeJS.Timeout;
    
    const initializeMap = async () => {
      if (!mapContainerRef.current || mapRef.current) return;

      try {
        // Set a timeout to prevent infinite loading
        loadTimeout = setTimeout(() => {
          if (!isMapReady) {
            setMapError('Map loading timed out. Please try refreshing the page.');
            console.error('Map loading timeout');
          }
        }, 15000); // 15 second timeout

        const { data, error } = await supabase.functions.invoke('get-mapbox-token');
        
        if (error || !data?.token) {
          console.error('Failed to fetch Mapbox token:', error);
          setMapError('Failed to fetch map token');
          return;
        }

        mapboxgl.accessToken = data.token;
        
        const map = new mapboxgl.Map({
          container: mapContainerRef.current,
          style: 'mapbox://styles/mapbox/satellite-streets-v12',
          center: [78.9629, 20.5937], // Center of India
          zoom: 4.5,
          pitch: 0,
        });

        map.on('error', (e) => {
          console.error('Mapbox error:', e);
          setMapError('Map failed to load properly');
          setIsMapReady(true); // Remove loading spinner
        });

        map.addControl(
          new mapboxgl.NavigationControl({
            visualizePitch: false,
          }),
          'top-right'
        );

        // Handle map clicks
        map.on('click', (e) => {
          const { lng, lat } = e.lngLat;
          
          // Validate India bounds
          if (lat < 8 || lat > 37 || lng < 68 || lng > 97) {
            toast.error("Please select a location within India (8-37°N, 68-97°E)");
            return;
          }

          setSelectedCoords({ lat, lon: lng });

          // Remove existing marker
          if (markerRef.current) {
            markerRef.current.remove();
          }

          // Create custom marker element
          const el = document.createElement('div');
          el.className = 'animate-bounce-in';
          el.style.width = '32px';
          el.style.height = '32px';
          el.style.backgroundImage = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%231a4d2e'%3E%3Cpath d='M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z'/%3E%3C/svg%3E")`;
          el.style.backgroundSize = 'contain';
          el.style.cursor = 'pointer';

          markerRef.current = new mapboxgl.Marker({ element: el })
            .setLngLat([lng, lat])
            .addTo(map);

          // Fly to selected location
          map.flyTo({
            center: [lng, lat],
            zoom: 18,
            duration: 1500,
            essential: true,
          });

          toast.success(`Selected: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        });

        map.on('load', () => {
          clearTimeout(loadTimeout);
          setIsMapReady(true);
          console.log('Map preloaded successfully');
        });

        mapRef.current = map;
      } catch (err) {
        console.error('Map initialization error:', err);
        setMapError('Failed to initialize map');
        toast.error('Failed to initialize map');
      }
    };

    initializeMap();

    return () => {
      if (loadTimeout) {
        clearTimeout(loadTimeout);
      }
      if (markerRef.current) {
        markerRef.current.remove();
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []); // Initialize once on mount

  const handleMapVerify = () => {
    if (!selectedCoords) {
      toast.error("Please select a location on the map first");
      return;
    }
    onVerify(selectedCoords.lat, selectedCoords.lon);
  };

  return (
    <Card className="p-8 shadow-[0_2px_8px_hsla(150,15%,20%,0.08)] border border-border rounded-2xl animate-fade-in w-full max-w-2xl">
      {/* Hidden map container for background preloading */}
      <div className="absolute opacity-0 pointer-events-none w-0 h-0 overflow-hidden">
        <div ref={mapContainerRef} className="w-full h-full" />
      </div>

      <div className="text-center space-y-2 mb-6">
        <div className="inline-flex p-3 rounded-xl bg-primary/10 mb-2">
          <MapPin className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Solar Verification</h2>
        <p className="text-sm text-muted-foreground">Enter coordinates or upload files</p>
      </div>

      <Tabs defaultValue="manual" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="manual">Manual Entry</TabsTrigger>
          <TabsTrigger value="map">Map Picker</TabsTrigger>
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

        {/* Map Picker Tab */}
        <TabsContent value="map">
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
              <p className="flex items-center gap-2 font-medium mb-1">
                <Map className="w-4 h-4" />
                Click anywhere on the map to select coordinates
              </p>
              <p className="text-xs">
                The map will zoom in to your selected location. You can click multiple times to change the selection.
              </p>
            </div>

            <div className="relative rounded-lg overflow-hidden border-2 border-border">
              {/* Map displays here via the preloaded container */}
              <div className="w-full h-[400px] bg-muted mapboxgl-map"></div>
              {!isMapReady && !mapError && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-primary" />
                    <p className="text-sm text-muted-foreground">Loading map...</p>
                  </div>
                </div>
              )}
              {mapError && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                  <div className="text-center max-w-md px-4">
                    <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-3">
                      <X className="w-6 h-6 text-destructive" />
                    </div>
                    <p className="text-sm font-medium text-foreground mb-1">Map Load Failed</p>
                    <p className="text-xs text-muted-foreground">{mapError}</p>
                  </div>
                </div>
              )}
            </div>

            {selectedCoords && (
              <Card className="p-4 bg-accent/10 border-accent/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Selected Location</p>
                    <p className="font-mono text-sm font-semibold">
                      {selectedCoords.lat.toFixed(6)}, {selectedCoords.lon.toFixed(6)}
                    </p>
                  </div>
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
              </Card>
            )}

            <Button
              type="button"
              onClick={handleMapVerify}
              disabled={!selectedCoords || isLoading}
              className="w-full h-12 text-base font-semibold"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <MapPin className="w-5 h-5 mr-2" />
                  Verify Selected Location
                </>
              )}
            </Button>
          </div>
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
