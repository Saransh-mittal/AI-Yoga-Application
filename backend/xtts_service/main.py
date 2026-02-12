"""
XTTS Backend - WITH SSE PROGRESS TRACKING
==========================================
File Location: backend/xtts_service/main.py (REPLACE ENTIRE FILE)

CHANGES:
- Added two-step process: init endpoint returns operation_id
- Added SSE endpoint for streaming progress updates
- Background task for async voice pack generation
- Progress tracking through VoicePackManager
"""

from fastapi import FastAPI, HTTPException, UploadFile, File, Form, BackgroundTasks, Request
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from TTS.api import TTS
from typing import Optional
import os
import tempfile
import logging
import warnings
import subprocess
import json
import uuid
import asyncio

from voice_pack_manager import VoicePackManager

warnings.filterwarnings("ignore", category=DeprecationWarning, module="librosa")

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

USE_GPU = os.getenv("XTTS_USE_GPU", "false").lower() == "true"
MODEL_NAME = "tts_models/multilingual/multi-dataset/xtts_v2"
DEFAULT_VOICE_PATH = "default_voice.wav"
DEFAULT_VOICE_PACK_ID = "default"

tts_model = None
voice_pack_manager = None


def create_default_voice():
    """Create default voice sample (cross-platform: espeak for Linux/Docker, say for macOS)"""
    if os.path.exists(DEFAULT_VOICE_PATH):
        logger.info("Default voice exists")
        return
    sample_text = (
        "Hello, I am your default breathing guide. "
        "I will help you find peace and balance through your practice."
    )
    # Try espeak first (Linux/Docker)
    try:
        logger.info("Creating default voice with espeak...")
        subprocess.run(
            ["espeak", "-w", DEFAULT_VOICE_PATH, sample_text],
            check=True, capture_output=True
        )
        logger.info("Default voice created with espeak")
        return
    except (FileNotFoundError, subprocess.CalledProcessError):
        logger.info("espeak not available, trying macOS say...")
    # Fallback to macOS say
    try:
        subprocess.run(
            ["say", "-v", "Samantha", "-o", DEFAULT_VOICE_PATH, sample_text],
            check=True, capture_output=True
        )
        logger.info("Default voice created with say")
        return
    except (FileNotFoundError, subprocess.CalledProcessError):
        pass
    logger.warning("Could not create default voice (no TTS tool available)")

async def create_default_voice_pack():
    """Create default voice pack on startup"""
    global voice_pack_manager
    try:
        if voice_pack_manager.get_voice_pack(DEFAULT_VOICE_PACK_ID):
            logger.info(f"Ã¢Å“â€¦ Default pack exists")
            return

        logger.info("Creating default pack...")
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

        await voice_pack_manager.create_voice_pack_with_id(
            pack_id=DEFAULT_VOICE_PACK_ID,
            name="Default Voice (Samantha)",
            voice_sample_path=DEFAULT_VOICE_PATH,
            instructions=default_instructions,
            language="en",
            speed=1.0
        )
        logger.info(f"Ã¢Å“â€¦ Default pack created")
    except Exception as e:
        logger.error(f"Failed to create default pack: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    global tts_model, voice_pack_manager

    logger.info("="*80)
    logger.info("Ã°Å¸Å¡â‚¬ XTTS BACKEND STARTING - WITH SSE PROGRESS")
    logger.info("="*80)

    try:
        create_default_voice()
        logger.info(f"Loading model (GPU: {USE_GPU})...")
        tts_model = TTS(MODEL_NAME, gpu=USE_GPU)
        logger.info("Ã¢Å“â€¦ Model loaded")

        voice_pack_manager = VoicePackManager(tts_model)
        logger.info("Ã¢Å“â€¦ Manager initialized")

        await create_default_voice_pack()

        logger.info("="*80)
        logger.info("Ã¢Å“â€¦ BACKEND READY - SSE Progress Tracking Enabled")
        logger.info("="*80)
    except Exception as e:
        logger.error(f"Ã¢ÂÅ’ Startup failed: {e}")
        raise

    yield

    logger.info("Shutting down...")


app = FastAPI(
    title="XTTS Backend - SSE Progress",
    description="Voice pack generation with real-time progress updates",
    version="7.0.0",
    lifespan=lifespan
)

# Build CORS origins from env var + localhost defaults
_default_origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:8000",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "http://127.0.0.1:8000",
]
_env_origins = os.getenv("ALLOWED_ORIGINS", "").split(",")
_all_origins = _default_origins + [o.strip() for o in _env_origins if o.strip()]
logger.info(f"CORS origins: {_all_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_all_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)


# Global exception handler to ensure CORS headers are always added
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """
    Catch all unhandled exceptions and return proper error response
    This ensures CORS headers are always added, even for unexpected errors
    """
    logger.error(f"❌ Unhandled exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {str(exc)}"},
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "*",
        }
    )


# Handle OPTIONS preflight requests for all routes
@app.options("/{rest_of_path:path}")
async def preflight_handler(rest_of_path: str):
    """
    Handle CORS preflight OPTIONS requests for any path
    This ensures browsers can make cross-origin requests to all endpoints
    """
    return JSONResponse(
        content={"message": "OK"},
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "*",
        }
    )


@app.get("/")
async def health():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "version": "7.0.0",
        "mode": "sse_progress",
        "model_loaded": tts_model is not None,
        "manager_ready": voice_pack_manager is not None,
    }


# ============================================================================
# VOICE PACK CREATION - TWO-STEP WITH SSE
# ============================================================================

async def _create_voice_pack_background(
    operation_id: str,
    name: str,
    temp_voice_path: str,
    instructions_dict: dict,
    language: str,
    speed: float
):
    """
    Background task for voice pack creation

    This runs asynchronously and updates progress via VoicePackManager.
    The frontend connects to the SSE endpoint to receive updates.
    """
    global voice_pack_manager

    try:
        logger.info(f"Ã°Å¸â€â€ž Background task started for operation {operation_id}")

        await voice_pack_manager.create_voice_pack(
            name=name,
            voice_sample_path=temp_voice_path,
            instructions=instructions_dict,
            language=language,
            speed=speed,
            operation_id=operation_id  # This enables progress tracking
        )

        logger.info(f"Ã¢Å“â€¦ Background task completed for operation {operation_id}")

    except Exception as e:
        logger.error(f"Ã¢ÂÅ’ Background task failed: {e}")
        # Error is already tracked in voice_pack_manager
    finally:
        # Cleanup temp file
        if os.path.exists(temp_voice_path):
            try:
                os.remove(temp_voice_path)
            except:
                pass


@app.post("/api/voice-packs/init")
async def init_voice_pack_creation(
    background_tasks: BackgroundTasks,
    name: str = Form(...),
    voice_sample: UploadFile = File(...),
    instructions: str = Form(...),
    language: str = Form("en"),
    speed: float = Form(1.0)
):
    """
    STEP 1: Initialize voice pack creation

    This endpoint:
    1. Validates input
    2. Saves voice sample to temp file
    3. Generates operation_id
    4. Starts background task for generation
    5. Returns operation_id immediately

    Frontend then connects to /api/voice-packs/progress/{operation_id}
    to receive real-time updates via SSE.
    """
    if not voice_pack_manager:
        raise HTTPException(status_code=503, detail="Service not ready")

    logger.info("")
    logger.info("="*80)
    logger.info("Ã°Å¸â€œÂ¤ INIT VOICE PACK CREATION")
    logger.info("="*80)
    logger.info(f"   Name: {name}")
    logger.info(f"   Language: {language}")
    logger.info(f"   Speed: {speed}x")

    try:
        # Parse instructions
        instructions_dict = json.loads(instructions)
        required = ['left-inhale', 'right-exhale', 'right-inhale', 'left-exhale', 'hold']
        for key in required:
            if key not in instructions_dict:
                raise HTTPException(status_code=400, detail=f"Missing phase: {key}")

        # Save voice sample to temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as temp_file:
            content = await voice_sample.read()
            temp_file.write(content)
            temp_voice_path = temp_file.name

        logger.info(f"   Sample saved: {len(content)} bytes")

        # Generate operation ID
        operation_id = str(uuid.uuid4())
        logger.info(f"   Operation ID: {operation_id}")

        # Start background task
        background_tasks.add_task(
            _create_voice_pack_background,
            operation_id=operation_id,
            name=name,
            temp_voice_path=temp_voice_path,
            instructions_dict=instructions_dict,
            language=language,
            speed=speed
        )

        logger.info("   Ã¢Å“â€¦ Background task scheduled")
        logger.info("="*80)
        logger.info("")

        return JSONResponse(content={
            "operation_id": operation_id,
            "message": "Voice pack creation started. Connect to progress endpoint for updates."
        })

    except json.JSONDecodeError as e:
        logger.error(f"   Ã¢ÂÅ’ Invalid JSON: {e}")
        raise HTTPException(status_code=400, detail=f"Invalid JSON: {str(e)}")
    except Exception as e:
        logger.error(f"   Ã¢ÂÅ’ Initialization failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/voice-packs/progress/{operation_id}")
async def stream_voice_pack_progress(operation_id: str):
    """
    STEP 2: Stream progress updates via SSE

    This endpoint streams real-time progress updates for voice pack creation.

    SSE Format:
    - Each message is: data: {json}\n\n
    - Frontend receives progress updates in real-time
    - Connection stays open until completion or error

    Progress Update Format:
    {
        "operation_id": "uuid",
        "status": "initializing|processing|completed|error",
        "progress": 0-100,
        "message": "Human readable message",
        "current_phase": "left-inhale",
        "current_file": 5,
        "total_files": 20,
        "voice_pack_id": "pack_uuid",
        "error_detail": "Error message if status=error"
    }
    """
    if not voice_pack_manager:
        raise HTTPException(status_code=503, detail="Service not ready")

    async def event_generator():
        """
        Generator that yields SSE formatted progress updates

        This continuously checks for progress updates and sends them
        to the client. When status is 'completed' or 'error', it stops.
        """
        logger.info(f"Ã°Å¸â€œÂ¡ SSE connection opened for operation {operation_id}")

        last_progress = None
        max_wait_time = 300  # 5 minutes timeout
        elapsed_time = 0
        check_interval = 0.5  # Check every 500ms

        try:
            while elapsed_time < max_wait_time:
                progress = voice_pack_manager.get_progress(operation_id)

                if progress is None:
                    # Operation not started yet, wait
                    await asyncio.sleep(check_interval)
                    elapsed_time += check_interval
                    continue

                # Only send if progress changed
                if progress != last_progress:
                    progress_dict = progress.to_dict()
                    yield f"data: {json.dumps(progress_dict)}\n\n"
                    last_progress = progress

                    logger.info(
                        f"Ã°Å¸â€œÅ  SSE [{operation_id[:8]}]: "
                        f"{progress.progress:.1f}% - {progress.message}"
                    )

                # Check if completed or errored
                if progress.status in ['completed', 'error']:
                    logger.info(f"Ã¢Å“â€¦ SSE stream completed for {operation_id}")

                    # Clean up progress tracking after short delay
                    await asyncio.sleep(2)
                    voice_pack_manager.clear_progress(operation_id)
                    break

                await asyncio.sleep(check_interval)
                elapsed_time += check_interval

            if elapsed_time >= max_wait_time:
                logger.warning(f"Ã¢ÂÂ±Ã¯Â¸Â SSE timeout for operation {operation_id}")
                yield f"data: {json.dumps({'status': 'error', 'message': 'Operation timeout'})}\n\n"

        except Exception as e:
            logger.error(f"Ã¢ÂÅ’ SSE stream error: {e}")
            yield f"data: {json.dumps({'status': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"  # Disable nginx buffering
        }
    )


# ============================================================================
# VOICE PACK UPDATE WITH SSE
# ============================================================================

async def _update_voice_pack_background(
    operation_id: str,
    pack_id: str,
    instructions_dict: dict,
    phases_to_update: list | None
):
    """Background task for voice pack update"""
    global voice_pack_manager

    try:
        logger.info(f"Ã°Å¸â€â€ž Background update started for {operation_id}")

        await voice_pack_manager.update_voice_pack(
            pack_id=pack_id,
            updated_instructions=instructions_dict,
            phases_to_update=phases_to_update,
            operation_id=operation_id
        )

        logger.info(f"Ã¢Å“â€¦ Background update completed for {operation_id}")

    except Exception as e:
        logger.error(f"Ã¢ÂÅ’ Background update failed: {e}")


@app.post("/api/voice-packs/{pack_id}/update/init")
async def init_voice_pack_update(
    pack_id: str,
    background_tasks: BackgroundTasks,
    instructions: str = Form(...),
    phases_to_update: Optional[str] = Form(None)
):
    """Initialize voice pack update with SSE progress"""
    if not voice_pack_manager:
        raise HTTPException(status_code=503, detail="Service not ready")

    logger.info("")
    logger.info("="*80)
    logger.info(f"Ã°Å¸â€â€ž INIT VOICE PACK UPDATE: {pack_id}")
    logger.info("="*80)

    try:
        # Parse instructions
        instructions_dict = json.loads(instructions)
        phases_list = json.loads(phases_to_update) if phases_to_update else None

        # Verify pack exists
        if not voice_pack_manager.get_voice_pack(pack_id):
            raise HTTPException(status_code=404, detail="Voice pack not found")

        # Generate operation ID
        operation_id = str(uuid.uuid4())
        logger.info(f"   Operation ID: {operation_id}")
        logger.info(f"   Phases: {phases_list or 'all'}")

        # Start background task
        background_tasks.add_task(
            _update_voice_pack_background,
            operation_id=operation_id,
            pack_id=pack_id,
            instructions_dict=instructions_dict,
            phases_to_update=phases_list
        )

        logger.info("   Ã¢Å“â€¦ Background task scheduled")
        logger.info("="*80)
        logger.info("")

        return JSONResponse(content={
            "operation_id": operation_id,
            "message": "Voice pack update started. Connect to progress endpoint for updates."
        })

    except json.JSONDecodeError as e:
        logger.error(f"   Ã¢ÂÅ’ Invalid JSON: {e}")
        raise HTTPException(status_code=400, detail=f"Invalid JSON: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"   Ã¢ÂÅ’ Update init failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# SPEED UPDATE WITH SSE
# ============================================================================

async def _update_voice_pack_speed_background(
    operation_id: str,
    pack_id: str,
    new_speed: float
):
    """Background task for speed update"""
    global voice_pack_manager

    try:
        logger.info(f"Ã°Å¸â€â€ž Background speed update started for {operation_id}")

        await voice_pack_manager.update_voice_pack_speed(
            pack_id=pack_id,
            new_speed=new_speed,
            operation_id=operation_id
        )

        logger.info(f"Ã¢Å“â€¦ Background speed update completed for {operation_id}")

    except Exception as e:
        logger.error(f"Ã¢ÂÅ’ Background speed update failed: {e}")


@app.post("/api/voice-packs/{pack_id}/update-speed/init")
async def init_voice_pack_speed_update(
    pack_id: str,
    background_tasks: BackgroundTasks,
    new_speed: float = Form(...)
):
    """Initialize voice pack speed update with SSE progress"""
    if not voice_pack_manager:
        raise HTTPException(status_code=503, detail="Service not ready")

    logger.info("")
    logger.info("="*80)
    logger.info(f"Ã°Å¸Å½Å¡Ã¯Â¸Â INIT SPEED UPDATE: {pack_id}")
    logger.info(f"   New speed: {new_speed}x")
    logger.info("="*80)

    try:
        # Verify pack exists
        if not voice_pack_manager.get_voice_pack(pack_id):
            raise HTTPException(status_code=404, detail="Voice pack not found")

        # Generate operation ID
        operation_id = str(uuid.uuid4())
        logger.info(f"   Operation ID: {operation_id}")

        # Start background task
        background_tasks.add_task(
            _update_voice_pack_speed_background,
            operation_id=operation_id,
            pack_id=pack_id,
            new_speed=new_speed
        )

        logger.info("   Ã¢Å“â€¦ Background task scheduled")
        logger.info("="*80)
        logger.info("")

        return JSONResponse(content={
            "operation_id": operation_id,
            "message": "Speed update started. Connect to progress endpoint for updates."
        })

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"   Ã¢ÂÅ’ Speed update init failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# OTHER ENDPOINTS (unchanged)
# ============================================================================

@app.get("/api/voice-packs")
async def list_packs(category: Optional[str] = None, language: Optional[str] = None):
    """
    List voice packs with optional filtering

    Query Parameters:
    - category: Filter by pack category
      - 'default': Only system/default packs (including DEFAULT_VOICE_PACK_ID)
      - 'user': Only user-created packs
      - None: All packs (default behavior)
    - language: Filter by language code (e.g., 'en', 'hi')

    Examples:
    - GET /api/voice-packs - Returns all packs
    - GET /api/voice-packs?category=default - Returns only default packs
    - GET /api/voice-packs?category=user - Returns only user-created packs
    - GET /api/voice-packs?language=en - Returns only English packs
    - GET /api/voice-packs?category=default&language=en - Returns default English packs
    """
    if not voice_pack_manager:
        raise HTTPException(status_code=503)

    try:
        packs = voice_pack_manager.list_voice_packs()

        # ========================================================================
        # CATEGORY FILTERING
        # ========================================================================
        if category == 'default':
            # Return only default/system packs
            logger.info(f"ðŸ“‹ Filtering packs: category=default")

            # Include the main DEFAULT_VOICE_PACK_ID and other system packs
            default_pack = next((p for p in packs if p['id'] == DEFAULT_VOICE_PACK_ID), None)

            if default_pack:
                # Start with system default
                filtered_packs = [default_pack]

                # Add other default packs (those created from guided voice generation)
                # Default packs typically have 'is_default' flag or specific naming pattern
                other_defaults = [
                    p for p in packs
                    if p['id'] != DEFAULT_VOICE_PACK_ID and (
                        p['id'].startswith('default_') or  # Guided packs from generate_anulom_vilom_voices.py
                        p['id'].startswith('anulom_') or  # Alternative naming
                        p.get('is_default', False)  # Explicitly marked as default
                    )
                ]
                filtered_packs.extend(other_defaults)
                packs = filtered_packs
            else:
                # Fallback: return other default packs if main default doesn't exist
                packs = [
                    p for p in packs
                    if p['id'].startswith('default_') or p['id'].startswith('anulom_') or p.get('is_default', False)
                ]

            logger.info(f"   âœ… Found {len(packs)} default packs")

        elif category == 'user':
            # Return only user-created packs (exclude system defaults)
            logger.info(f"ðŸ“‹ Filtering packs: category=user")

            packs = [
                p for p in packs
                if p['id'] != DEFAULT_VOICE_PACK_ID and
                not p['id'].startswith('default_') and
                not p['id'].startswith('anulom_') and
                not p.get('is_default', False)
            ]

            logger.info(f"   âœ… Found {len(packs)} user-created packs")

        # ========================================================================
        # LANGUAGE FILTERING (optional, works with category)
        # ========================================================================
        if language:
            logger.info(f"ðŸ“‹ Filtering packs: language={language}")

            packs = [p for p in packs if p.get('language', 'en').lower() == language.lower()]

            logger.info(f"   âœ… Found {len(packs)} packs with language={language}")

        # ========================================================================
        # REORDER (system default always first)
        # ========================================================================
        if category != 'user':  # Don't reorder if specifically asking for user packs
            default = next((p for p in packs if p['id'] == DEFAULT_VOICE_PACK_ID), None)
            if default:
                packs = [p for p in packs if p['id'] != DEFAULT_VOICE_PACK_ID]
                packs.insert(0, default)

        logger.info(f"   ðŸ“¦ Returning {len(packs)} packs")
        return JSONResponse(content={"voice_packs": packs})

    except Exception as e:
        logger.error(f"âŒ Failed to list voice packs: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/voice-packs/{pack_id}")
async def get_pack(pack_id: str):
    """Get voice pack metadata"""
    if not voice_pack_manager:
        raise HTTPException(status_code=503)
    try:
        metadata = voice_pack_manager.get_voice_pack(pack_id)
        if not metadata:
            raise HTTPException(status_code=404)
        return JSONResponse(content=metadata)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/voice-packs/{pack_id}")
async def delete_pack(pack_id: str):
    """Delete voice pack"""
    if not voice_pack_manager:
        raise HTTPException(status_code=503)
    if pack_id == DEFAULT_VOICE_PACK_ID:
        raise HTTPException(status_code=403, detail="Cannot delete system default")
    try:
        success = voice_pack_manager.delete_voice_pack(pack_id)
        if not success:
            raise HTTPException(status_code=404)
        return JSONResponse(content={"status": "success"})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/voice-packs/{pack_id}/audio/{phase_key}/{variant_index}")
async def get_audio(pack_id: str, phase_key: str, variant_index: int):
    """Get audio file"""
    if not voice_pack_manager:
        logger.error("Voice pack manager not initialized")
        raise HTTPException(status_code=503, detail="Service not ready")

    try:
        logger.info(f"🎵 Fetching audio: {pack_id}/{phase_key}/{variant_index}")

        file_path = voice_pack_manager.get_audio_file_path(pack_id, phase_key, variant_index)

        if not file_path:
            logger.error(f"❌ Audio file not found: {pack_id}/{phase_key}/{variant_index}")
            raise HTTPException(status_code=404, detail="Audio file not found")

        if not os.path.exists(file_path):
            logger.error(f"❌ File path doesn't exist: {file_path}")
            raise HTTPException(status_code=404, detail="Audio file not found")

        logger.info(f"✅ Serving audio file: {file_path}")
        return FileResponse(
            file_path,
            media_type="audio/wav",
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, OPTIONS",
                "Access-Control-Allow-Headers": "*",
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error serving audio: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    logger.info("="*80)
    logger.info(f"Starting on port {port} - SSE PROGRESS MODE")
    logger.info("="*80)
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
