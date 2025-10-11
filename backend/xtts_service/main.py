"""
XTTS v2 Backend with Default Voice Pack - ENHANCED
===================================================
File Location: backend/xtts_service/main.py (REPLACE EXISTING)

NEW FEATURES:
- Automatic default voice pack creation on startup
- Default pack uses Mac's built-in voice
- Always available for immediate use
- Users can start breathing without uploading voice
"""

from fastapi import FastAPI, HTTPException, UploadFile, File, Form, BackgroundTasks
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from TTS.api import TTS
from typing import Optional, Dict, List
import os
import tempfile
import logging
import warnings
import subprocess
import json

from voice_pack_manager import VoicePackManager

# Suppress warnings
warnings.filterwarnings("ignore", category=DeprecationWarning, module="librosa")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Configuration
USE_GPU = os.getenv("XTTS_USE_GPU", "false").lower() == "true"
MODEL_NAME = "tts_models/multilingual/multi-dataset/xtts_v2"
DEFAULT_VOICE_PATH = "default_voice.wav"
DEFAULT_VOICE_PACK_ID = "default"

# Global instances
tts_model = None
voice_pack_manager = None


def create_default_voice():
    """
    Create default voice sample using Mac's say command

    LEARNING NOTE: This creates a high-quality voice sample that will be
    used to generate the default voice pack. Using Mac's built-in TTS
    ensures consistent quality and no user input required.
    """
    if os.path.exists(DEFAULT_VOICE_PATH):
        logger.info(f"Default voice already exists: {DEFAULT_VOICE_PATH}")
        return

    try:
        logger.info("Creating default voice sample...")

        sample_text = (
            "Hello, I am your default breathing guide. "
            "I will help you find peace and balance through your practice. "
            "Breathe deeply, stay present, and let go of all tension. "
            "Your journey to inner calm begins now."
        )

        # Use Samantha voice (warm, clear female voice)
        subprocess.run(
            ["say", "-v", "Samantha", "-o", DEFAULT_VOICE_PATH, sample_text],
            check=True
        )

        logger.info(f"✅ Default voice created: {DEFAULT_VOICE_PATH}")

    except (subprocess.CalledProcessError, FileNotFoundError) as e:
        logger.warning(f"Could not create default voice: {e}")


async def create_default_voice_pack():
    """
    Create default voice pack on startup

    ARCHITECTURE NOTE: This runs once on startup to ensure users always
    have a working voice pack available without any setup.
    """
    global voice_pack_manager

    try:
        # Check if default pack already exists
        existing_pack = voice_pack_manager.get_voice_pack(DEFAULT_VOICE_PACK_ID)
        if existing_pack:
            logger.info(f"✅ Default voice pack already exists")
            return

        logger.info("Creating default voice pack...")

        # Default instructions (English)
        default_instructions = {
            'left-inhale': [
                "Breathe in deeply through your left nostril",
                "Inhale slowly through the left nostril",
                "Draw in fresh energy through your left nostril"
            ],
            'right-exhale': [
                "Exhale slowly through your right nostril",
                "Release through your right nostril",
                "Let go through the right nostril"
            ],
            'right-inhale': [
                "Breathe in deeply through your right nostril",
                "Inhale slowly through the right nostril",
                "Draw in fresh prana through your right nostril"
            ],
            'left-exhale': [
                "Exhale slowly through your left nostril",
                "Release through your left nostril",
                "Let go through the left nostril"
            ],
            'hold': [
                "Hold your breath gently",
                "Retain the breath within",
                "Keep the breath steady and calm"
            ]
        }

        # Create the pack with a fixed ID for easy reference
        metadata = await voice_pack_manager.create_voice_pack_with_id(
            pack_id=DEFAULT_VOICE_PACK_ID,
            name="Default Voice (Samantha)",
            voice_sample_path=DEFAULT_VOICE_PATH,
            instructions=default_instructions,
            language="en",
            speed=1.0
        )

        logger.info(f"✅ Default voice pack created successfully")
        logger.info(f"   - Total audio files: {metadata['total_audio_files']}")
        logger.info(f"   - Language: {metadata['language']}")
        logger.info(f"   - Speed: {metadata['speed']}x")

    except Exception as e:
        logger.error(f"Failed to create default voice pack: {str(e)}")
        # Don't raise - non-critical failure


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown"""
    # Startup
    global tts_model, voice_pack_manager

    try:
        # Create default voice sample
        create_default_voice()

        # Load XTTS model
        logger.info(f"Loading XTTS v2 model (GPU: {USE_GPU})...")
        tts_model = TTS(MODEL_NAME, gpu=USE_GPU)
        logger.info("✅ Model loaded successfully")

        # Initialize voice pack manager
        voice_pack_manager = VoicePackManager(tts_model)
        logger.info("✅ Voice Pack Manager initialized")

        # Create default voice pack
        await create_default_voice_pack()

    except Exception as e:
        logger.error(f"Failed to initialize: {str(e)}")
        raise

    yield  # Server runs

    # Shutdown
    logger.info("Shutting down XTTS backend...")


# Initialize FastAPI
app = FastAPI(
    title="XTTS v2 TTS Service with Default Voice",
    description="Pre-generated voice instruction system with auto-created default voice",
    version="2.1.0",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "https://your-production-domain.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================================
# HEALTH & STATUS ENDPOINTS
# ============================================================================

@app.get("/")
async def root():
    """Health check endpoint with default pack status"""
    default_pack = voice_pack_manager.get_voice_pack(DEFAULT_VOICE_PACK_ID) if voice_pack_manager else None

    return {
        "status": "healthy",
        "model": MODEL_NAME,
        "gpu_enabled": USE_GPU,
        "model_loaded": tts_model is not None,
        "voice_pack_manager_ready": voice_pack_manager is not None,
        "default_voice_available": os.path.exists(DEFAULT_VOICE_PATH),
        "default_voice_pack_ready": default_pack is not None,
        "default_voice_pack_id": DEFAULT_VOICE_PACK_ID if default_pack else None,
        "supported_languages": [
            "en", "es", "fr", "de", "it", "pt", "pl", "tr",
            "ru", "nl", "cs", "ar", "zh-cn", "ja", "hu", "ko", "hi"
        ]
    }


# ============================================================================
# VOICE PACK ENDPOINTS
# ============================================================================

@app.post("/api/voice-packs/create")
async def create_voice_pack(
    background_tasks: BackgroundTasks,
    name: str = Form(...),
    voice_sample: UploadFile = File(...),
    instructions: str = Form(...),
    language: str = Form("en"),
    speed: float = Form(1.0)
):
    """Create a new voice pack"""
    if not voice_pack_manager:
        raise HTTPException(status_code=503, detail="Voice pack manager not initialized")

    try:
        instructions_dict = json.loads(instructions)

        required_keys = ['left-inhale', 'right-exhale', 'right-inhale', 'left-exhale', 'hold']
        for key in required_keys:
            if key not in instructions_dict:
                raise HTTPException(
                    status_code=400,
                    detail=f"Missing required instruction key: {key}"
                )

        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_file:
            content = await voice_sample.read()
            temp_file.write(content)
            temp_voice_path = temp_file.name

        logger.info(f"Creating voice pack '{name}' with {len(instructions_dict)} phases")

        metadata = await voice_pack_manager.create_voice_pack(
            name=name,
            voice_sample_path=temp_voice_path,
            instructions=instructions_dict,
            language=language,
            speed=speed
        )

        os.remove(temp_voice_path)

        logger.info(f"✅ Voice pack created: {metadata['id']}")

        return JSONResponse(content={
            "status": "success",
            "voice_pack": metadata
        })

    except json.JSONDecodeError as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON: {str(e)}")
    except Exception as e:
        logger.error(f"Voice pack creation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/voice-packs/{pack_id}/update")
async def update_voice_pack(
    pack_id: str,
    instructions: str = Form(...),
    phases_to_update: Optional[str] = Form(None)
):
    """Update specific instructions in a voice pack"""
    if not voice_pack_manager:
        raise HTTPException(status_code=503, detail="Voice pack manager not initialized")

    try:
        instructions_dict = json.loads(instructions)
        phases_list = json.loads(phases_to_update) if phases_to_update else None

        metadata = await voice_pack_manager.update_voice_pack(
            pack_id=pack_id,
            updated_instructions=instructions_dict,
            phases_to_update=phases_list
        )

        return JSONResponse(content={
            "status": "success",
            "voice_pack": metadata
        })

    except json.JSONDecodeError as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON: {str(e)}")
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Voice pack update failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/voice-packs/{pack_id}/update-speed")
async def update_voice_pack_speed(
    pack_id: str,
    new_speed: float = Form(...)
):
    """
    Update voice pack speed (regenerates all audio)

    LEARNING NOTE: This is a specialized endpoint for speed-only updates.
    It's more efficient than the full update endpoint since it only
    changes one parameter and regenerates accordingly.
    """
    if not voice_pack_manager:
        raise HTTPException(status_code=503, detail="Voice pack manager not initialized")

    # Prevent modification of system default
    if pack_id == DEFAULT_VOICE_PACK_ID:
        raise HTTPException(
            status_code=403,
            detail="Cannot modify system default voice pack"
        )

    # Validate speed range
    if new_speed < 0.5 or new_speed > 2.0:
        raise HTTPException(
            status_code=400,
            detail="Speed must be between 0.5 and 2.0"
        )

    try:
        metadata = await voice_pack_manager.update_voice_pack_speed(
            pack_id=pack_id,
            new_speed=new_speed
        )

        return JSONResponse(content={
            "status": "success",
            "voice_pack": metadata
        })

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Voice pack speed update failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/voice-packs")
async def list_voice_packs():
    """List all available voice packs"""
    if not voice_pack_manager:
        raise HTTPException(status_code=503, detail="Voice pack manager not initialized")

    try:
        packs = voice_pack_manager.list_voice_packs()

        # Ensure default pack is first in list
        default_pack_summary = next((p for p in packs if p['id'] == DEFAULT_VOICE_PACK_ID), None)
        if default_pack_summary:
            packs = [p for p in packs if p['id'] != DEFAULT_VOICE_PACK_ID]
            packs.insert(0, default_pack_summary)

        return JSONResponse(content={"voice_packs": packs})
    except Exception as e:
        logger.error(f"Failed to list voice packs: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/voice-packs/{pack_id}")
async def get_voice_pack(pack_id: str):
    """Get full metadata for a specific voice pack"""
    if not voice_pack_manager:
        raise HTTPException(status_code=503, detail="Voice pack manager not initialized")

    try:
        metadata = voice_pack_manager.get_voice_pack(pack_id)

        if not metadata:
            raise HTTPException(status_code=404, detail="Voice pack not found")

        return JSONResponse(content=metadata)

    except Exception as e:
        logger.error(f"Failed to get voice pack: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/voice-packs/{pack_id}")
async def delete_voice_pack(pack_id: str):
    """Delete a voice pack"""
    if not voice_pack_manager:
        raise HTTPException(status_code=503, detail="Voice pack manager not initialized")

    # Prevent deletion of default pack
    if pack_id == DEFAULT_VOICE_PACK_ID:
        raise HTTPException(
            status_code=403,
            detail="Cannot delete default voice pack"
        )

    try:
        success = voice_pack_manager.delete_voice_pack(pack_id)

        if not success:
            raise HTTPException(status_code=404, detail="Voice pack not found")

        return JSONResponse(content={
            "status": "success",
            "message": "Voice pack deleted"
        })

    except Exception as e:
        logger.error(f"Failed to delete voice pack: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/voice-packs/{pack_id}/audio/{phase_key}/{variant_index}")
async def get_audio_file(pack_id: str, phase_key: str, variant_index: int):
    """Stream a specific pre-generated audio file"""
    if not voice_pack_manager:
        raise HTTPException(status_code=503, detail="Voice pack manager not initialized")

    try:
        file_path = voice_pack_manager.get_audio_file_path(
            pack_id=pack_id,
            phase_key=phase_key,
            variant_index=variant_index
        )

        if not file_path:
            raise HTTPException(status_code=404, detail="Audio file not found")

        return FileResponse(
            file_path,
            media_type="audio/wav",
            filename=f"{phase_key}_{variant_index}.wav"
        )

    except Exception as e:
        logger.error(f"Failed to serve audio file: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# LEGACY TTS ENDPOINT (for compatibility)
# ============================================================================

@app.post("/api/tts")
async def text_to_speech(
    text: str = Form(...),
    language: str = Form("en"),
    speed: float = Form(1.0),
    speaker_wav: Optional[UploadFile] = File(None)
):
    """Legacy real-time TTS endpoint"""
    if not tts_model:
        raise HTTPException(status_code=503, detail="TTS model not loaded")

    try:
        if not text or len(text) > 5000:
            raise HTTPException(status_code=400, detail="Invalid text length")

        speaker_wav_path = None
        use_default = False

        if speaker_wav:
            with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_audio:
                content = await speaker_wav.read()
                temp_audio.write(content)
                speaker_wav_path = temp_audio.name
        elif os.path.exists(DEFAULT_VOICE_PATH):
            speaker_wav_path = DEFAULT_VOICE_PATH
            use_default = True
        else:
            raise HTTPException(status_code=400, detail="No voice sample available")

        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_output:
            output_path = temp_output.name

        tts_model.tts_to_file(
            text=text,
            file_path=output_path,
            speaker_wav=speaker_wav_path,
            language=language,
            speed=speed
        )

        if speaker_wav_path and not use_default and os.path.exists(speaker_wav_path):
            os.remove(speaker_wav_path)

        def cleanup_temp_file():
            try:
                if os.path.exists(output_path):
                    os.remove(output_path)
            except Exception as e:
                logger.warning(f"Failed to cleanup temp file: {e}")

        from starlette.background import BackgroundTask

        return FileResponse(
            output_path,
            media_type="audio/wav",
            filename="speech.wav",
            background=BackgroundTask(cleanup_temp_file)
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"TTS generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", 8000))

    logger.info(f"Starting XTTS v2 backend with Default Voice Pack on port {port}")
    logger.info(f"GPU mode: {USE_GPU}")
    logger.info("Press CTRL+C to stop")

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=port,
        log_level="info"
    )
