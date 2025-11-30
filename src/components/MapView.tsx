import { useEffect, useRef, useState } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { AlertCircle, RefreshCw, Maximize2, Eye, GitCompare, Info } from "lucide-react";
import mapboxgl from "mapbox-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import "mapbox-gl/dist/mapbox-gl.css";
import * as turf from "@turf/turf";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { GroundTruthAnnotation } from "@/types/annotation";
import AnnotationToolbar from "./AnnotationToolbar";

interface MapViewProps {
  coordinates: { lat: number; lon: number } | null;
  detectionPolygons?: Array<{
    type: 'Polygon';
    coordinates: number[][][];
    confidence: number;
  }>;
  annotationMode: boolean;
  onAnnotationsChange: (annotations: GroundTruthAnnotation[]) => void;
  groundTruthAnnotations: GroundTruthAnnotation[];
  showComparison: boolean;
  onToggleComparison: () => void;
}

const MapView = ({ 
  coordinates, 
  detectionPolygons,
  annotationMode,
  onAnnotationsChange,
  groundTruthAnnotations,
  showComparison,
  onToggleComparison
}: MapViewProps) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const drawRef = useRef<MapboxDraw | null>(null);
  const [isLoadingToken, setIsLoadingToken] = useState(true);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [showPVMask, setShowPVMask] = useState(false);
  const [localAnnotations, setLocalAnnotations] = useState<GroundTruthAnnotation[]>([]);

  useEffect(() => {
    const initializeMap = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-mapbox-token');
        
        if (error || !data?.token) {
          console.error('Failed to fetch Mapbox token:', error);
          toast.error('Failed to load map configuration');
          setIsLoadingToken(false);
          return;
        }

        mapboxgl.accessToken = data.token;
        
        if (!mapContainerRef.current || mapRef.current) return;

        mapRef.current = new mapboxgl.Map({
          container: mapContainerRef.current,
          style: 'mapbox://styles/mapbox/satellite-streets-v12',
          center: [78.9629, 20.5937],
          zoom: 4,
          pitch: 0,
        });

        mapRef.current.addControl(
          new mapboxgl.NavigationControl({
            visualizePitch: true,
          }),
          'top-right'
        );

        // Initialize MapboxDraw
        drawRef.current = new MapboxDraw({
          displayControlsDefault: false,
          controls: {},
          styles: [
            // Ground truth polygons style (green)
            {
              id: 'gl-draw-polygon-fill',
              type: 'fill',
              filter: ['all', ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
              paint: {
                'fill-color': 'hsl(142, 76%, 36%)',
                'fill-opacity': 0.4
              }
            },
            {
              id: 'gl-draw-polygon-stroke-active',
              type: 'line',
              filter: ['all', ['==', '$type', 'Polygon'], ['!=', 'mode', 'static']],
              paint: {
                'line-color': 'hsl(142, 76%, 36%)',
                'line-width': 3
              }
            },
            {
              id: 'gl-draw-line-active',
              type: 'line',
              filter: ['all', ['==', '$type', 'LineString'], ['==', 'active', 'true']],
              paint: {
                'line-color': 'hsl(142, 76%, 36%)',
                'line-width': 2
              }
            },
            {
              id: 'gl-draw-polygon-and-line-vertex-active',
              type: 'circle',
              filter: ['all', ['==', 'meta', 'vertex'], ['==', '$type', 'Point']],
              paint: {
                'circle-radius': 5,
                'circle-color': 'hsl(142, 76%, 36%)'
              }
            }
          ]
        });

        mapRef.current.addControl(drawRef.current, 'top-right');

        // Handle drawing events
        mapRef.current.on('draw.create', handleDrawCreate);
        mapRef.current.on('draw.update', handleDrawUpdate);
        mapRef.current.on('draw.delete', handleDrawDelete);

        // Track map load state
        mapRef.current.on('load', () => {
          setIsMapLoaded(true);
        });

        setIsLoadingToken(false);
      } catch (err) {
        console.error('Map initialization error:', err);
        toast.error('Failed to initialize map');
        setIsLoadingToken(false);
      }
    };

    initializeMap();

    return () => {
      if (markerRef.current) {
        markerRef.current.remove();
      }
      if (mapRef.current) {
        mapRef.current.off('draw.create', handleDrawCreate);
        mapRef.current.off('draw.update', handleDrawUpdate);
        mapRef.current.off('draw.delete', handleDrawDelete);
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Handle drawing events
  const handleDrawCreate = (e: any) => {
    const features = e.features;
    const newAnnotations: GroundTruthAnnotation[] = features.map((feature: any) => {
      const polygon = turf.polygon(feature.geometry.coordinates);
      const area = turf.area(polygon);
      
      return {
        id: feature.id,
        type: 'Polygon',
        coordinates: feature.geometry.coordinates,
        created_at: new Date().toISOString(),
        area_sqm: area,
        panel_type: 'unknown',
        notes: ''
      };
    });
    
    setLocalAnnotations(prev => [...prev, ...newAnnotations]);
  };

  const handleDrawUpdate = (e: any) => {
    const features = e.features;
    setLocalAnnotations(prev => {
      const updated = [...prev];
      features.forEach((feature: any) => {
        const idx = updated.findIndex(a => a.id === feature.id);
        if (idx !== -1) {
          const polygon = turf.polygon(feature.geometry.coordinates);
          const area = turf.area(polygon);
          updated[idx] = {
            ...updated[idx],
            coordinates: feature.geometry.coordinates,
            area_sqm: area
          };
        }
      });
      return updated;
    });
  };

  const handleDrawDelete = (e: any) => {
    const deletedIds = e.features.map((f: any) => f.id);
    setLocalAnnotations(prev => prev.filter(a => !deletedIds.includes(a.id)));
  };

  // Annotation toolbar handlers
  const handleToggleAnnotationMode = () => {
    if (annotationMode) {
      onAnnotationsChange(localAnnotations);
    }
  };

  const handleDrawPolygon = () => {
    if (drawRef.current) {
      drawRef.current.changeMode('draw_polygon');
    }
  };

  const handleDrawRectangle = () => {
    if (drawRef.current) {
      // MapboxDraw doesn't have built-in rectangle, using polygon instead
      drawRef.current.changeMode('draw_polygon');
      toast.info("Draw a polygon with 4 corners for a rectangle");
    }
  };

  const handleToggleEdit = () => {
    if (drawRef.current) {
      const mode = drawRef.current.getMode();
      if (mode === 'simple_select') {
        drawRef.current.changeMode('direct_select');
      } else {
        drawRef.current.changeMode('simple_select');
      }
    }
  };

  const handleDeleteSelected = () => {
    if (drawRef.current) {
      const selected = drawRef.current.getSelected();
      if (selected.features.length > 0) {
        drawRef.current.trash();
        toast.success("Deleted selected annotation");
      } else {
        toast.error("No annotation selected");
      }
    }
  };

  const handleClearAll = () => {
    if (drawRef.current) {
      drawRef.current.deleteAll();
      setLocalAnnotations([]);
      toast.success("All annotations cleared");
    }
  };

  const handleSaveAnnotations = () => {
    onAnnotationsChange(localAnnotations);
    toast.success(`Saved ${localAnnotations.length} annotation${localAnnotations.length !== 1 ? 's' : ''}`);
  };

  // Sync ground truth annotations when they change
  useEffect(() => {
    if (drawRef.current && groundTruthAnnotations.length > 0) {
      drawRef.current.deleteAll();
      groundTruthAnnotations.forEach(annotation => {
        drawRef.current?.add({
          type: 'Feature',
          id: annotation.id,
          properties: {},
          geometry: {
            type: 'Polygon',
            coordinates: annotation.coordinates
          }
        });
      });
      setLocalAnnotations(groundTruthAnnotations);
    }
  }, [groundTruthAnnotations]);

  useEffect(() => {
    if (!mapRef.current || !coordinates) return;

    if (markerRef.current) {
      markerRef.current.remove();
    }

    // Create custom marker element with bounce animation
    const el = document.createElement('div');
    el.className = 'animate-bounce-in';
    el.style.width = '40px';
    el.style.height = '40px';
    el.style.backgroundImage = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%231a4d2e'%3E%3Cpath d='M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z'/%3E%3C/svg%3E")`;
    el.style.backgroundSize = 'contain';
    el.style.cursor = 'pointer';

    markerRef.current = new mapboxgl.Marker({ element: el })
      .setLngLat([coordinates.lon, coordinates.lat])
      .addTo(mapRef.current);

    // Smooth fly animation - wait for map to be fully loaded
    const flyToLocation = () => {
      if (!mapRef.current) return;
      mapRef.current.flyTo({
        center: [coordinates.lon, coordinates.lat],
        zoom: 19,
        pitch: 45,
        duration: 2000,
        essential: true,
        easing: (t) => t * (2 - t), // ease-out
      });
    };

    if (isMapLoaded) {
      flyToLocation();
    } else {
      // Wait for map to load if it hasn't yet
      mapRef.current.once('load', flyToLocation);
    }
  }, [coordinates, isMapLoaded]);

  // Add detection polygons overlay (AI detections)
  useEffect(() => {
    if (!mapRef.current || !detectionPolygons || (!showPVMask && !showComparison)) return;

    const map = mapRef.current;

    // Wait for map to be loaded
    if (!map.isStyleLoaded()) {
      map.once('load', () => addPolygons());
    } else {
      addPolygons();
    }

    function addPolygons() {
      if (!mapRef.current || !detectionPolygons) return;
      const map = mapRef.current;

      // Remove existing source and layer if they exist
      if (map.getLayer('detection-polygons')) {
        map.removeLayer('detection-polygons');
      }
      if (map.getLayer('detection-polygons-outline')) {
        map.removeLayer('detection-polygons-outline');
      }
      if (map.getSource('detection-polygons')) {
        map.removeSource('detection-polygons');
      }

      if (detectionPolygons.length === 0) return;

      // Add source
      map.addSource('detection-polygons', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: detectionPolygons.map((polygon, idx) => ({
            type: 'Feature',
            properties: {
              confidence: polygon.confidence,
              id: idx
            },
            geometry: polygon
          }))
        }
      });

      // Add fill layer with dashed pattern for AI detection
      map.addLayer({
        id: 'detection-polygons',
        type: 'fill',
        source: 'detection-polygons',
        paint: {
          'fill-color': 'hsl(38, 92%, 50%)', // Saffron/amber color
          'fill-opacity': showComparison ? 0.2 : 0.3
        }
      });

      // Add dashed outline layer for AI detection
      map.addLayer({
        id: 'detection-polygons-outline',
        type: 'line',
        source: 'detection-polygons',
        paint: {
          'line-color': 'hsl(38, 92%, 50%)',
          'line-width': 3,
          'line-opacity': 0.8,
          'line-dasharray': [2, 2]
        }
      });

      if (!showComparison) {
        toast.success(`${detectionPolygons.length} detection zone${detectionPolygons.length > 1 ? 's' : ''} displayed`);
      }
    }

    return () => {
      if (!mapRef.current) return;
      const map = mapRef.current;
      if (map.getLayer('detection-polygons')) {
        map.removeLayer('detection-polygons');
      }
      if (map.getLayer('detection-polygons-outline')) {
        map.removeLayer('detection-polygons-outline');
      }
      if (map.getSource('detection-polygons')) {
        map.removeSource('detection-polygons');
      }
    };
  }, [detectionPolygons, showPVMask, showComparison]);

  const handleRefresh = () => {
    if (mapRef.current && coordinates) {
      mapRef.current.flyTo({
        center: [coordinates.lon, coordinates.lat],
        zoom: 19,
        pitch: 45,
        duration: 1500,
        essential: true,
      });
      toast.success("Imagery refreshed");
    }
  };

  return (
    <div className="w-full h-full relative bg-muted/20">
      <div ref={mapContainerRef} className="w-full h-full" />
      
      {/* Annotation Toolbar */}
      {coordinates && !isLoadingToken && (
        <AnnotationToolbar
          isActive={annotationMode}
          annotationCount={localAnnotations.length}
          onToggleMode={handleToggleAnnotationMode}
          onDrawPolygon={handleDrawPolygon}
          onDrawRectangle={handleDrawRectangle}
          onToggleEdit={handleToggleEdit}
          onDeleteSelected={handleDeleteSelected}
          onClearAll={handleClearAll}
          onSave={handleSaveAnnotations}
        />
      )}
      
      {/* Map Control Buttons */}
      {coordinates && !isLoadingToken && (
        <div className="absolute top-6 right-6 z-10 flex flex-col gap-2 animate-fade-in">
          <Button
            size="sm"
            variant={showPVMask ? "default" : "secondary"}
            className="shadow-lg backdrop-blur-sm bg-card/95 hover:bg-card border-border/50 transition-all"
            onClick={() => {
              if (!detectionPolygons || detectionPolygons.length === 0) {
                toast.error("No detection zones available");
                return;
              }
              setShowPVMask(!showPVMask);
            }}
            disabled={!detectionPolygons || detectionPolygons.length === 0}
          >
            <Eye className="w-4 h-4 mr-2" />
            PV Mask
          </Button>
          <Button
            size="sm"
            variant={showComparison ? "default" : "secondary"}
            className="shadow-lg backdrop-blur-sm bg-card/95 hover:bg-card border-border/50 transition-all"
            onClick={onToggleComparison}
            disabled={!detectionPolygons || detectionPolygons.length === 0 || groundTruthAnnotations.length === 0}
          >
            <GitCompare className="w-4 h-4 mr-2" />
            Compare
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="shadow-lg backdrop-blur-sm bg-card/95 hover:bg-card border-border/50 transition-all"
            onClick={handleRefresh}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="shadow-lg backdrop-blur-sm bg-card/95 hover:bg-card border-border/50 transition-all"
            onClick={() => mapRef.current?.flyTo({ zoom: 20, pitch: 0 })}
          >
            <Maximize2 className="w-4 h-4" />
          </Button>
        </div>
      )}
      
      {isLoadingToken && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/90 backdrop-blur-sm">
          <Card className="p-8 max-w-sm text-center shadow-2xl border-border/50 animate-scale-in">
            <div className="w-14 h-14 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm font-medium text-foreground">Initializing satellite view...</p>
            <p className="text-xs text-muted-foreground mt-1">Loading Mapbox configuration</p>
          </Card>
        </div>
      )}
      
      {!isLoadingToken && !coordinates && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <Card className="p-8 max-w-md text-center bg-card/95 backdrop-blur-sm shadow-xl border-border/50 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-bold text-lg mb-2 text-foreground">No Location Selected</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Enter coordinates in the panel above to begin remote rooftop verification
            </p>
          </Card>
        </div>
      )}

      {coordinates && (
        <div className="absolute bottom-6 left-6 right-6 max-w-md animate-slide-up">
          <Card className="p-4 bg-card/95 backdrop-blur-md shadow-lg border-border/50">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Current Location</p>
                <p className="font-mono text-sm font-semibold text-foreground">
                  {coordinates.lat.toFixed(6)}, {coordinates.lon.toFixed(6)}
                </p>
              </div>
              <TooltipProvider>
                <div className="text-right">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1 justify-end cursor-help">
                        <p className="text-xs text-muted-foreground">Zoom: 19</p>
                        <Info className="w-3 h-3 text-muted-foreground" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Zoom level 19 provides ~0.3m/pixel resolution</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1 justify-end cursor-help">
                        <p className="text-xs text-success font-medium">High Resolution</p>
                        <Info className="w-3 h-3 text-success" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Sufficient detail for panel detection</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </TooltipProvider>
            </div>
          </Card>
        </div>
      )}

      {/* Attribution footer */}
      <div className="absolute bottom-2 right-2 text-[10px] text-muted-foreground/60 bg-background/80 px-2 py-1 rounded backdrop-blur-sm">
        © Mapbox | Prototype Only
      </div>
    </div>
  );
};

export default MapView;
