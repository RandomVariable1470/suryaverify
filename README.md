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

> **⚠️ SECURITY WARNING**: This application uses sensitive API keys. Never commit your `.env` file to version control. See [SECURITY.md](SECURITY.md) for detailed security guidelines.

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. **Set up environment variables**:
   ```bash
   cp .env.example .env
   ```
   Then edit `.env` and add your API keys:
   - **VITE_MAPBOX_TOKEN**: Get from [Mapbox Access Tokens](https://account.mapbox.com/access-tokens/)
   - **VITE_GEMINI_API_KEY**: Get from [Google AI Studio](https://aistudio.google.com/app/apikey)

4. Start the development server:
   ```bash
   npm run dev
   ```

## Security

**CRITICAL**: Before pushing to GitHub, ensure:
- [ ] `.env` is listed in `.gitignore`
- [ ] No API keys are hardcoded in source files
- [ ] You're using `.env.example` as a template (not actual keys)

See [SECURITY.md](SECURITY.md) for complete security guidelines.

## Building for Production

```bash
npm run build
```
