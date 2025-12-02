# SuryaVerify

A satellite imagery analysis tool for detecting rooftop solar PV installations in India under the PM Surya Ghar: Muft Bijli Yojana scheme.

## Features

- **Manual Verification**: Enter coordinates to fetch satellite imagery and analyze solar potential.
- **Satellite Upload**: Upload your own satellite imagery for analysis.
- **Batch Processing**: Upload a CSV of coordinates for bulk verification.
- **AI-Powered Analysis**: Uses Google Gemini to detect solar panels, estimate capacity, and provide confidence scores.
- **Export**: Download results as JSON, GeoJSON, or ZIP archives.

## Tech Stack

- Vite
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- Mapbox GL JS
- Google Gemini API

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory with the following variables:
   ```
   VITE_MAPBOX_TOKEN=your_mapbox_token_here
   VITE_GEMINI_API_KEY=your_gemini_api_key_here
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

## Building for Production

```bash
npm run build
```
