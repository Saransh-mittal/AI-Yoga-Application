# XTTS Backend Dockerfile
# Python 3.11 with PyTorch CPU + XTTS v2 TTS model
# Optimized for Railway serverless deployment

FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for audio processing and espeak TTS
RUN apt-get update && apt-get install -y --no-install-recommends \
  espeak \
  espeak-ng \
  libsndfile1 \
  ffmpeg \
  && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .

# Install PyTorch CPU-only first (smaller than the full CUDA version)
RUN pip install --no-cache-dir \
  torch==2.5.1+cpu \
  torchvision==0.20.1+cpu \
  torchaudio==2.5.1+cpu \
  --index-url https://download.pytorch.org/whl/cpu

# Install remaining dependencies (skip torch since we already installed CPU version)
RUN grep -v "^torch" requirements.txt | grep -v "^torchvision" | grep -v "^torchaudio" | pip install --no-cache-dir -r /dev/stdin

# CRITICAL FIX: Force numpy to 1.x to fix "expected np.ndarray (got numpy.ndarray)" PyTorch/Coqui TTS ABI C-extension error
RUN pip install "numpy<2.0.0"

# Copy application code
COPY main.py .
COPY voice_pack_manager.py .
COPY setup_common_voice.py .

# Create directories for voice data
RUN mkdir -p voice_packs default_voices guided_voices voice_samples

# Auto-accept Coqui TTS license (required for non-interactive Docker)
ENV COQUI_TOS_AGREED=1

# Railway sets PORT dynamically
ENV PORT=8000
EXPOSE 8000

# Run the FastAPI server
CMD ["python", "main.py"]
