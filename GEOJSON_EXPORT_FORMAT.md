# GeoJSON Export Format - SuryaVerify

## Overview

SuryaVerify exports solar panel detection results in standard GeoJSON format for seamless integration with GIS software and government mapping systems.

## File Format

- **Extension**: `.geojson`
- **MIME Type**: `application/geo+json`
- **Coordinate System**: WGS84 (EPSG:4326)
- **Format**: RFC 7946 compliant GeoJSON

## Structure

### Individual Result Export

Single verification result with detection zones:

```json
{
  "type": "FeatureCollection",
  "metadata": {
    "sample_id": 12345,
    "center_lat": 28.6448,
    "center_lon": 77.2167,
    "verification_date": "2025-01-30T10:30:00Z",
    "has_solar": true,
    "overall_confidence": 0.92,
    "panel_count": 24,
    "pv_area_sqm": 45.6,
    "capacity_kw": 9.12,
    "qc_status": "VERIFIABLE",
    "source": "SuryaVerify - PM Surya Ghar Verification System",
    "imagery_source": "Mapbox Satellite",
    "imagery_zoom": 19
  },
  "features": [
    {
      "type": "Feature",
      "id": "detection_12345_1",
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [77.2165, 28.6450],
            [77.2169, 28.6450],
            [77.2169, 28.6446],
            [77.2165, 28.6446],
            [77.2165, 28.6450]
          ]
        ]
      },
      "properties": {
        "zone_id": 1,
        "confidence": 0.95,
        "confidence_percent": "95.0%",
        "detection_method": "AI-powered satellite imagery analysis",
        "model": "Lovable AI - Google Gemini 2.5 Pro",
        "verification_status": "VERIFIABLE"
      }
    }
  ]
}
```

### Bulk Export

Multiple verifications in a single file:

```json
{
  "type": "FeatureCollection",
  "metadata": {
    "export_date": "2025-01-30T10:30:00Z",
    "total_verifications": 150,
    "total_detections": 132,
    "source": "SuryaVerify - PM Surya Ghar Verification System",
    "export_format": "GeoJSON"
  },
  "features": [
    {
      "type": "Feature",
      "id": "detection_12345_1",
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[...]]]
      },
      "properties": {
        "sample_id": 12345,
        "zone_id": 1,
        "center_lat": 28.6448,
        "center_lon": 77.2167,
        "has_solar": true,
        "overall_confidence": 0.92,
        "zone_confidence": 0.95,
        "panel_count": 24,
        "pv_area_sqm": 45.6,
        "capacity_kw": 9.12,
        "qc_status": "VERIFIABLE",
        "verification_type": "solar_detection",
        "detection_method": "AI-powered satellite imagery analysis"
      }
    }
  ]
}
```

### No Detection Cases

Locations with no solar panels detected are included as Point features:

```json
{
  "type": "Feature",
  "id": "verification_12346",
  "geometry": {
    "type": "Point",
    "coordinates": [77.2200, 28.6500]
  },
  "properties": {
    "sample_id": 12346,
    "has_solar": false,
    "confidence": 0.88,
    "qc_status": "VERIFIABLE",
    "verification_type": "no_detection"
  }
}
```

## Feature Properties

### Metadata Fields

| Field | Type | Description |
|-------|------|-------------|
| `sample_id` | integer | Unique identifier for verification |
| `center_lat` | number | Center latitude of verification area |
| `center_lon` | number | Center longitude of verification area |
| `has_solar` | boolean | Whether solar panels were detected |
| `overall_confidence` | number | Overall detection confidence (0.0-1.0) |
| `zone_confidence` | number | Confidence for specific detection zone |
| `panel_count` | integer | Estimated number of solar panels |
| `pv_area_sqm` | number | Total PV area in square meters |
| `capacity_kw` | number | Estimated capacity in kilowatts |
| `qc_status` | string | Quality control status: "VERIFIABLE" or "NOT_VERIFIABLE" |
| `verification_type` | string | "solar_detection" or "no_detection" |
| `detection_method` | string | Method used for detection |

## GIS Software Compatibility

### QGIS
1. Open QGIS
2. Layer → Add Layer → Add Vector Layer
3. Select the `.geojson` file
4. Polygons will be displayed with properties in the attribute table

### ArcGIS
1. Add Data → Browse to `.geojson` file
2. File will be automatically recognized as GeoJSON
3. Use attribute table to view detection properties

### Google Earth Pro
1. File → Import → Select `.geojson`
2. Detection zones will be displayed as polygons

### Python (GeoPandas)
```python
import geopandas as gpd

# Read GeoJSON
gdf = gpd.read_file('verification_results_2025-01-30.geojson')

# View data
print(gdf.head())

# Filter high-confidence detections
high_conf = gdf[gdf['overall_confidence'] > 0.8]
```

### R (sf package)
```r
library(sf)

# Read GeoJSON
detections <- st_read("verification_results_2025-01-30.geojson")

# View structure
str(detections)

# Plot
plot(st_geometry(detections))
```

## Government Integration

### National Spatial Data Infrastructure (NSDI)
- Coordinate system: WGS84 (compatible with Indian NSDI standards)
- Format: RFC 7946 compliant GeoJSON
- Projection: Can be reprojected to local UTM zones as needed

### PM Surya Ghar Portal Integration
1. Export verification results as GeoJSON
2. Upload to portal's spatial data module
3. Use `sample_id` for linking with subsidy applications
4. `qc_status` field indicates audit-ready detections

### State GIS Portals
- Compatible with Bhuvan (ISRO)
- Can be imported into state land records systems
- Supports overlay with cadastral maps

## Technical Specifications

- **Coordinate Precision**: 6 decimal places (~0.11 meters)
- **Polygon Vertices**: Typically 5 points (closed polygon)
- **File Size**: ~1-2 KB per verification with polygons
- **Encoding**: UTF-8
- **Line Endings**: LF (Unix-style)

## Quality Assurance

All exported GeoJSON files include:
- Verification timestamp
- Detection confidence scores
- QC status flags
- Source imagery metadata
- AI model information

This ensures full traceability and audit compliance for government subsidy verification.

## Support

For technical support or integration assistance, please contact:
- Email: support@suryaverify.gov.in
- Portal: https://suryaverify.gov.in/help
