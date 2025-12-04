# somAI: Medical AI Companion & Clinical Risk Assessment 🐢

somAI is a multi-modal AI health assistant designed for patient education, vital signs tracking, and clinical risk assessment. It utilizes a hybrid architecture, prioritizing high-speed cloud models (**Google Gemini 2.5 Flash**) while maintaining privacy-focused fallback nodes for text (**Phi-3**) and media (**Moondream/Whisper**) processing.

---

## 📋 Features

### 🩺 Clinical Dashboard
* **Vitals Tracking:** Monitor Systolic BP (Morning/Evening), Glucose, SpO2, Heart Rate, and Temperature.
* **Real-time Risk Analysis:** Generates a risk score (0-100) based on vitals, lifestyle factors, and anomalies.
* **Anomaly Detection:** Visual alerts for critical vital ranges (e.g., Hypertensive crisis, Hypoxia).
* **Medical Coding Pipeline:** Automatically suggests ICD-10 codes based on patient history and condition (validated against a mock database).

### 💬 AI Companion (Multi-Modal)
* **Tiered AI Engine:**
    * **Primary:** Google Gemini 2.5 Flash (Cloud).
    * **Fallback:** Microsoft Phi-3 Mini (via Llama.cpp) for offline/private text generation.
* **Voice Interaction:** Bidirectional voice support using browser-native speech recognition and Gemini/Browser TTS.
* **Vision Capabilities:** Upload medical reports or skin condition images for analysis using Moondream2.
* **Modes:** Switch between "Medical Guide" (Clinical tone) and "Therapist" (Empathetic CBT tone).

### 💊 Medication & Lifestyle
* **Gamified Tracker:** Track adherence with "Streaks" and motivational quotes.
* **Lifestyle Profiling:** Records diet, exercise, smoking status, and family history.

### 📄 Reporting
* **Smart Report Generation:** Creates a printable, confidential PDF report containing demographics, vitals grids, and the AI clinical summary.
* **Insurance Notes:** Generates medical necessity notes for insurance verification.

---

## 🏗 Architecture

somAI operates on a micro-frontend/backend architecture distributed across Hugging Face Spaces:

1.  **Frontend (Main App):**
    * Built with React, TypeScript, and Vite.
    * Directly integrates with the Google GenAI SDK.
2.  **Text Node (Backend):**
    * **Hosted at:** [arshenoy/somAI-backend](https://huggingface.co/spaces/arshenoy/somAI-backend)
    * FastAPI service running Llama.cpp.
    * Hosts `Microsoft Phi-3-mini-4k-instruct-gguf`.
    * Handles clinical analysis when cloud quotas are exceeded or privacy is prioritized.
3.  **Media Node (Backend):**
    * **Hosted at:** [somAI Media](https://huggingface.co/spaces/arshenoy/somAI-media)
    * FastAPI service using Transformers and PyTorch.
    * **Vision:** `vikhyatk/moondream2` for image-to-text.
    * **Audio:** `distil-whisper/distil-small.en` for transcription.

---

## 🛠️ Tech Stack

* **Frontend:** React 18, Recharts (Visualization), Lucide React (Icons), React Markdown.
* **Containerization:** Docker, Nginx.
* **AI/ML Integration:**
    * `@google/genai` (Gemini 2.5 Flash & Flash Lite).
    * `llama-cpp-python` (Quantized LLM inference).
    * `huggingface_hub` (Model management).
    * `json_repair` (Robust JSON parsing from LLM outputs).

---

## 🚀 Getting Started

### Prerequisites
* Node.js 18+
* Docker (optional, for containerized deployment)
* Google Gemini API Key

### Installation

1.  **Clone the repository**
    ```bash
    git clone [https://github.com/your-username/somai.git](https://github.com/your-username/somai.git)
    cd somai
    ```

2.  **Install Frontend Dependencies**
    ```bash
    npm install
    ```

3.  **Configure Environment Variables**
    Create a `.env.local` file in the root directory:
    ```env
    VITE_GOOGLE_API_KEY=your_gemini_api_key_here
    # Optional: Override default fallback nodes if self-hosting
    # VITE_TEXT_NODE_URL=[https://huggingface.co/spaces/arshenoy/somAI-backend](https://huggingface.co/spaces/arshenoy/somAI-backend)
    # VITE_MEDIA_NODE_URL=[https://huggingface.co/spaces/arshenoy/somAI-media](https://huggingface.co/spaces/arshenoy/somAI-media)
    ```

4.  **Run Development Server**
    ```bash
    npm run dev
    ```

### Docker Deployment
The project includes a multi-stage Dockerfile for production deployment using Nginx.

```bash
# Build the image
docker build -t somai-app .

# Run the container (Exposed on port 7860 for HF Spaces compatibility)
docker run -p 7860:7860 somai-app
```
## 🧠 Backend Setup (Optional / Self-Host)

The application is pre-configured to use the following Hugging Face Spaces:

- **Text Node:** [somAI-backend](https://huggingface.co/spaces/arshenoy/somAI-backend)
- **Media Node:** [somAI Media](https://huggingface.co/spaces/arshenoy/somAI-media)

However, if you wish to self-host these nodes locally, you can run the Python FastAPI servers found in the backend directories.

---

### 📝 Text Node Requirements

**Purpose:** Local/offline fallback for clinical text analysis (Phi-3 via Llama.cpp)

**Dependencies:**
- `llama-cpp-python`
- `fastapi`
- `uvicorn`
- `huggingface_hub`

**Hardware Notes:**
- CPU-optimized  
- Recommended: OpenBLAS enabled for improved Llama.cpp performance

---

### 🖼 Media Node Requirements

**Purpose:** Handles vision (Moondream2) and audio (Whisper) processing.

**Dependencies:**
- `torch`
- `transformers`
- `pillow`
- `librosa`
- `ffmpeg`

**Hardware Notes:**
- **GPU strongly recommended** for Moondream2 + Whisper inference  
- CPU is supported but slower

---

## ⚠️ Disclaimer

This software is for **educational and informational purposes only**.  
It is **not a medical device** and is not intended to provide medical advice, diagnosis, or treatment.  
Risk scores and clinical summaries are generated by AI and may contain inaccuracies.  
Always consult a qualified healthcare professional for medical concerns.

---

## 📄 License

This project is licensed under the **Apache 2.0 License**.
