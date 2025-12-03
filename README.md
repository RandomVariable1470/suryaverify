# SuryaVerify ☀️

**Empowering India’s Clean Energy Future**

SuryaVerify is a comprehensive solar intelligence platform designed to accelerate rooftop solar adoption in India. It serves two main purposes:
1.  **Government Mode**: Helps state DISCOMs verify rooftop solar installations remotely using satellite imagery and AI.
2.  **Citizen Mode**: Helps citizens and students visualize solar potential on their homes using Augmented Reality (AR).

This project aligns with the **PM Surya Ghar: Muft Bijli Yojana** and the **Eco Innovators** sustainability mission.

## Features

### 🏛 Government Mode (Satellite Verification)
-   **Dashboard & Map Interface**: Visualizes verification data on an interactive map.
-   **Satellite Image Fetching**: Integrates with Mapbox to fetch high-resolution satellite imagery.
-   **AI Detection**: Uses Google Gemini Vision AI to detect solar panels, estimate count, area, and capacity.
-   **Batch Processing**: Supports CSV upload for bulk verification of multiple sites.
-   **Audit Artifacts**: Generates JSON exports and visual overlays for audit trails.

### 🏡 Citizen Mode (AR Solar Scanner)
-   **AR Interface**: Mobile-first Augmented Reality experience.
-   **Roof Plane Detection**: Uses WebXR to detect roof surfaces.
-   **Solar Calculator**: Estimates usable area, panel count, system size (kW), monthly savings (₹), and CO₂ reduction.
-   **3D Visualization**: Places virtual solar panels on the user's roof.

### 🤖 SuryaBot (AI Assistant)
-   **Context-Aware Chat**: An AI assistant that answers questions about solar energy, subsidies, and the verification process.
-   **Guidance**: Provides tips and encourages solar adoption.

## Tech Stack
-   **Frontend**: React, Vite, TypeScript, TailwindCSS
-   **Maps**: Mapbox GL JS
-   **AI**: Google Gemini API (multimodal)
-   **AR**: Three.js, @react-three/fiber, @react-three/xr
-   **UI Components**: shadcn/ui, Lucide React, Framer Motion

## Setup & Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/your-username/suryaverify.git
    cd suryaverify
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Configure Environment Variables**
    Create a `.env` file in the root directory and add your API keys:
    ```env
    VITE_MAPBOX_TOKEN=your_mapbox_token_here
    VITE_GEMINI_API_KEY=your_gemini_api_key_here
    ```

4.  **Run the development server**
    ```bash
    npm run dev
    ```

5.  **Build for production**
    ```bash
    npm run build
    ```

## Usage

-   **Toggle Modes**: Use the switch in the header to change between Government and Citizen modes.
-   **Government Mode**: Enter coordinates or upload a CSV to verify installations.
-   **Citizen Mode**: Open on a mobile device, click "Start AR Scan", and follow the on-screen instructions.
-   **SuryaBot**: Click the robot icon in the bottom right to chat with the AI assistant.

## License
MIT
