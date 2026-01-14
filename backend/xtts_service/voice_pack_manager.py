"""
Voice Pack Manager - WITH SSE PROGRESS TRACKING
===============================================
File Location: backend/xtts_service/voice_pack_manager.py (REPLACE ENTIRE FILE)

CHANGES:
- Added ProgressUpdate dataclass for structured progress data
- Added operation tracking with Dict[operation_id, progress]
- Added _update_progress() method for reporting progress
- Modified creation methods to report progress during generation
- Added get_progress() and clear_progress() methods
"""

import os
import uuid
import json
import shutil
import wave
import numpy as np
from typing import Dict, List, Optional
from pathlib import Path
from datetime import datetime
from dataclasses import dataclass, asdict
import logging
import asyncio

logger = logging.getLogger(__name__)

# Configuration
VOICE_PACKS_DIR = "voice_packs"  # User-created voice packs
GUIDED_VOICES_DIR = "guided_voices"  # Pre-generated guided voice packs (e.g., Anulom Vilom)
VOICE_SAMPLES_DIR = "voice_samples"
TARGET_SAMPLE_RATE = 48000
TARGET_BIT_DEPTH = 16


@dataclass
class ProgressUpdate:
    """Structured progress update data"""
    operation_id: str
    status: str  # 'initializing', 'processing', 'completed', 'error'
    progress: float  # 0.0 to 100.0
    message: str
    current_phase: Optional[str] = None
    voice_pack_id: Optional[str] = None
    error_detail: Optional[str] = None

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization"""
        return {k: v for k, v in asdict(self).items() if v is not None}


class VoicePackManager:
    """Voice Pack Manager - With SSE Progress Tracking"""

    def __init__(self, tts_model):
        self.tts_model = tts_model
        os.makedirs(VOICE_PACKS_DIR, exist_ok=True)
        os.makedirs(VOICE_SAMPLES_DIR, exist_ok=True)
        # Note: GUIDED_VOICES_DIR is created by generate_anulom_vilom_voices.py
        # We don't create it here to avoid confusion about its purpose

        # Progress tracking: operation_id -> ProgressUpdate
        self._progress_tracker: Dict[str, ProgressUpdate] = {}

        logger.info("âœ… VoicePackManager initialized with progress tracking")

    # ========================================================================
    # PROGRESS TRACKING
    # ========================================================================

    def _update_progress(
        self,
        operation_id: str,
        status: str,
        progress: float,
        message: str,
        current_phase: Optional[str] = None,
        voice_pack_id: Optional[str] = None,
        error_detail: Optional[str] = None
    ) -> None:
        """
        Update progress for an operation

        This method stores progress updates that can be retrieved by SSE endpoint.
        Progress is stored in memory and can be accessed via get_progress().
        """
        update = ProgressUpdate(
            operation_id=operation_id,
            status=status,
            progress=progress,
            message=message,
            current_phase=current_phase,
            voice_pack_id=voice_pack_id,
            error_detail=error_detail
        )

        self._progress_tracker[operation_id] = update

        logger.info(
            f"ðŸ“Š Progress [{operation_id[:8]}]: {progress:.1f}% - {message}"
        )

    def get_progress(self, operation_id: str) -> Optional[ProgressUpdate]:
        """Get current progress for an operation"""
        return self._progress_tracker.get(operation_id)

    def clear_progress(self, operation_id: str) -> None:
        """Clear progress tracking for completed/failed operations"""
        if operation_id in self._progress_tracker:
            del self._progress_tracker[operation_id]
            logger.info(f"ðŸ§¹ Cleared progress for operation {operation_id[:8]}")

    # ========================================================================
    # AUDIO PROCESSING (unchanged)
    # ========================================================================

    def _normalize_audio(self, audio_path: str) -> None:
        """Normalize audio volume to 70% of max"""
        try:
            with wave.open(audio_path, 'r') as wav_file:
                frames = wav_file.readframes(wav_file.getnframes())
                sample_width = wav_file.getsampwidth()
                channels = wav_file.getnchannels()
                framerate = wav_file.getframerate()

                if sample_width == 2:
                    audio_data = np.frombuffer(frames, dtype=np.int16)
                else:
                    logger.warning(f"Unsupported sample width: {sample_width}")
                    return

                max_val = np.abs(audio_data).max()
                if max_val > 0:
                    target_amplitude = 0.7 * 32767
                    normalized = (audio_data * (target_amplitude / max_val)).astype(np.int16)

                    with wave.open(audio_path, 'w') as out_wav:
                        out_wav.setnchannels(channels)
                        out_wav.setsampwidth(sample_width)
                        out_wav.setframerate(framerate)
                        out_wav.writeframes(normalized.tobytes())

            logger.debug(f"âœ… Audio normalized: {audio_path}")

        except Exception as e:
            logger.warning(f"Audio normalization failed (non-critical): {str(e)}")

    def _validate_audio_file(self, audio_path: str) -> bool:
        """Validate audio file has content"""
        try:
            with wave.open(audio_path, 'r') as wav_file:
                if wav_file.getnframes() == 0:
                    logger.error(f"Audio file has no frames: {audio_path}")
                    return False
                if wav_file.getframerate() == 0:
                    logger.error(f"Audio file has invalid framerate: {audio_path}")
                    return False
                return True
        except Exception as e:
            logger.error(f"Audio validation failed: {str(e)}")
            return False

    # ========================================================================
    # VOICE PACK CREATION WITH PROGRESS
    # ========================================================================

    async def create_voice_pack_with_id(
        self,
        pack_id: str,
        name: str,
        voice_sample_path: str,
        instructions: Dict[str, List[str]],
        language: str = "en",
        speed: float = 1.0,
        operation_id: Optional[str] = None
    ) -> Dict:
        """
        Create voice pack with progress tracking

        If operation_id is provided, progress updates are stored for SSE streaming.
        """
        logger.info(f"ðŸŽ¯ CREATE VOICE PACK")
        logger.info(f"   Pack ID: {pack_id}")
        logger.info(f"   Operation ID: {operation_id}")
        logger.info(f"   Name: {name}")

        try:
            pack_dir = os.path.join(VOICE_PACKS_DIR, pack_id)
            os.makedirs(pack_dir, exist_ok=True)

            # Calculate total files
            total_files = sum(len(instructions.get(key, [])) for key in instructions.keys())

            if operation_id:
                self._update_progress(
                    operation_id=operation_id,
                    status='initializing',
                    progress=0.0,
                    message='Initializing voice pack creation...',
                    voice_pack_id=pack_id
                )

            logger.info(f"   Total files to generate: {total_files}")

            # Copy voice sample
            voice_sample_copy = os.path.join(pack_dir, "voice_sample.wav")
            shutil.copy2(voice_sample_path, voice_sample_copy)

            if operation_id:
                self._update_progress(
                    operation_id=operation_id,
                    status='processing',
                    progress=5.0,
                    message='Voice sample copied, starting generation...',
                    voice_pack_id=pack_id
                )

            # Generate audio files with progress reporting
            audio_files = {}
            files_completed = 0
            phase_keys = ['left-inhale', 'right-exhale', 'right-inhale', 'left-exhale', 'hold']

            for phase_key in phase_keys:
                audio_files[phase_key] = []
                phase_instructions = instructions.get(phase_key, [])

                if not phase_instructions:
                    logger.warning(f"   No instructions for phase: {phase_key}")
                    continue

                logger.info(f"   Generating {phase_key} ({len(phase_instructions)} files)...")

                if operation_id:
                    self._update_progress(
                        operation_id=operation_id,
                        status='processing',
                        progress=5.0 + (files_completed / total_files) * 90.0,
                        message=f'Generating {phase_key} audio files...',
                        current_phase=phase_key,
                        voice_pack_id=pack_id
                    )

                for idx, instruction in enumerate(phase_instructions):
                    text = instruction.strip()
                    if not text:
                        logger.warning(f"   Empty instruction for {phase_key}[{idx}]")
                        continue

                    filename = f"{phase_key}_variant_{idx}.wav"
                    output_path = os.path.join(pack_dir, filename)

                    # Generate audio with TTS
                    try:
                        self.tts_model.tts_to_file(
                            text=text,
                            file_path=output_path,
                            speaker_wav=voice_sample_path,
                            language=language,
                            speed=speed
                        )
                    except Exception as e:
                        logger.error(f"   TTS generation failed for {filename}: {str(e)}")
                        continue

                    # Validate and normalize
                    if not self._validate_audio_file(output_path):
                        logger.error(f"   Invalid audio file: {filename}")
                        continue

                    self._normalize_audio(output_path)
                    audio_files[phase_key].append(filename)
                    files_completed += 1

                    # Report progress every file
                    if operation_id:
                        progress = 5.0 + (files_completed / total_files) * 90.0
                        self._update_progress(
                            operation_id=operation_id,
                            status='processing',
                            progress=progress,
                            message=f'Generating audio files... {int(progress)}%',
                            current_phase=phase_key,
                            voice_pack_id=pack_id
                        )

                    # Small delay to allow progress to be read
                    await asyncio.sleep(0.1)

            # Create metadata
            metadata = {
                "id": pack_id,
                "name": name,
                "created_at": datetime.utcnow().isoformat(),
                "language": language,
                "speed": speed,
                "audio_files": audio_files,
                "instructions": instructions,
                "total_audio_files": files_completed,
                "audio_quality": {
                    "sample_rate": TARGET_SAMPLE_RATE,
                    "bit_depth": TARGET_BIT_DEPTH,
                    "format": "wav"
                }
            }

            # Save metadata
            metadata_path = os.path.join(pack_dir, "metadata.json")
            with open(metadata_path, 'w') as f:
                json.dump(metadata, f, indent=2)

            if operation_id:
                self._update_progress(
                    operation_id=operation_id,
                    status='completed',
                    progress=100.0,
                    message=f'Voice pack created successfully!',
                    voice_pack_id=pack_id
                )

            logger.info(f"ðŸŽ‰ VOICE PACK CREATED")
            logger.info(f"   Pack ID: {pack_id}")
            logger.info(f"   Total files: {files_completed}")

            return metadata

        except Exception as e:
            logger.error(f"âŒ VOICE PACK CREATION FAILED")
            logger.error(f"   Error: {str(e)}", exc_info=True)

            if operation_id:
                self._update_progress(
                    operation_id=operation_id,
                    status='error',
                    progress=0.0,
                    message='Failed to create voice pack',
                    error_detail=str(e),
                    voice_pack_id=pack_id
                )

            # Cleanup on error
            if os.path.exists(pack_dir):
                shutil.rmtree(pack_dir)
                logger.info(f"   Cleaned up failed pack directory")

            raise

    async def create_voice_pack(
        self,
        name: str,
        voice_sample_path: str,
        instructions: Dict[str, List[str]],
        language: str = "en",
        speed: float = 1.0,
        operation_id: Optional[str] = None
    ) -> Dict:
        """Create voice pack with auto-generated ID"""
        pack_id = str(uuid.uuid4())
        return await self.create_voice_pack_with_id(
            pack_id=pack_id,
            name=name,
            voice_sample_path=voice_sample_path,
            instructions=instructions,
            language=language,
            speed=speed,
            operation_id=operation_id
        )

    # ========================================================================
    # UPDATE VOICE PACK
    # ========================================================================

    async def update_voice_pack(
        self,
        pack_id: str,
        updated_instructions: Dict[str, List[str]],
        phases_to_update: Optional[List[str]] = None,
        operation_id: Optional[str] = None
    ) -> Dict:
        """
        Update voice pack instructions with progress tracking

        This regenerates audio files for the same voice pack with new instructions.
        """
        logger.info(f"ðŸ”„ UPDATE VOICE PACK: {pack_id}")

        try:
            pack_dir = os.path.join(VOICE_PACKS_DIR, pack_id)
            if not os.path.exists(pack_dir):
                raise ValueError(f"Voice pack {pack_id} not found")

            metadata_path = os.path.join(pack_dir, "metadata.json")
            with open(metadata_path, 'r') as f:
                metadata = json.load(f)

            voice_sample_path = os.path.join(pack_dir, "voice_sample.wav")

            if phases_to_update is None:
                phases_to_update = list(updated_instructions.keys())

            total_files = sum(
                len(updated_instructions.get(phase, []))
                for phase in phases_to_update
            )

            logger.info(f"   Phases: {phases_to_update}")
            logger.info(f"   Total files to regenerate: {total_files}")

            if operation_id:
                self._update_progress(
                    operation_id=operation_id,
                    status='processing',
                    progress=0.0,
                    message=f'Updating voice pack instructions...',
                    voice_pack_id=pack_id
                )

            files_completed = 0

            for phase_key in phases_to_update:
                if phase_key not in updated_instructions:
                    continue

                logger.info(f"   Updating {phase_key}...")

                # Delete old files for this phase
                if phase_key in metadata["audio_files"]:
                    for old_file in metadata["audio_files"][phase_key]:
                        old_path = os.path.join(pack_dir, old_file)
                        if os.path.exists(old_path):
                            os.remove(old_path)
                            logger.info(f"   Deleted old file: {old_file}")

                # Generate new files
                metadata["audio_files"][phase_key] = []
                phase_instructions = updated_instructions[phase_key]

                for idx, instruction in enumerate(phase_instructions):
                    text = instruction.strip()
                    if not text:
                        logger.warning(f"   Empty instruction for {phase_key}[{idx}]")
                        continue

                    filename = f"{phase_key}_variant_{idx}.wav"
                    output_path = os.path.join(pack_dir, filename)

                    logger.info(f"   Generating: {filename}")

                    # Generate audio with TTS
                    try:
                        self.tts_model.tts_to_file(
                            text=text,
                            file_path=output_path,
                            speaker_wav=voice_sample_path,
                            language=metadata["language"],
                            speed=metadata["speed"]
                        )
                    except Exception as e:
                        logger.error(f"   TTS generation failed for {filename}: {str(e)}")
                        continue

                    # Validate and normalize
                    if self._validate_audio_file(output_path):
                        self._normalize_audio(output_path)
                        metadata["audio_files"][phase_key].append(filename)
                        logger.info(f"   âœ… Generated: {filename}")
                    else:
                        logger.error(f"   Invalid audio file: {filename}")
                        continue

                    files_completed += 1

                    if operation_id:
                        progress = (files_completed / total_files) * 100.0
                        self._update_progress(
                            operation_id=operation_id,
                            status='processing',
                            progress=progress,
                            message=f'Regenerating audio files... {int(progress)}%',
                            current_phase=phase_key,
                            voice_pack_id=pack_id
                        )

                    await asyncio.sleep(0.1)

                # Update instructions in metadata
                metadata["instructions"][phase_key] = phase_instructions

            # Update metadata timestamp
            metadata["updated_at"] = datetime.utcnow().isoformat()
            metadata["total_audio_files"] = sum(
                len(files) for files in metadata["audio_files"].values()
            )

            # Save updated metadata
            with open(metadata_path, 'w') as f:
                json.dump(metadata, f, indent=2)

            if operation_id:
                self._update_progress(
                    operation_id=operation_id,
                    status='completed',
                    progress=100.0,
                    message=f'Voice pack updated successfully!',
                    voice_pack_id=pack_id
                )

            logger.info(f"âœ… UPDATE COMPLETED")
            logger.info(f"   Pack ID: {pack_id}")
            logger.info(f"   Files regenerated: {files_completed}")

            return metadata

        except Exception as e:
            logger.error(f"âŒ UPDATE FAILED: {str(e)}", exc_info=True)

            if operation_id:
                self._update_progress(
                    operation_id=operation_id,
                    status='error',
                    progress=0.0,
                    message='Failed to update voice pack',
                    error_detail=str(e),
                    voice_pack_id=pack_id
                )

            raise

    # ========================================================================
    # UPDATE METHODS (similar pattern, add operation_id if needed)
    # ========================================================================

    async def update_voice_pack_speed(
        self,
        pack_id: str,
        new_speed: float,
        operation_id: Optional[str] = None
    ) -> Dict:
        """Update voice pack speed with progress tracking"""
        logger.info(f"ðŸŽšï¸ UPDATE SPEED: {pack_id}")
        logger.info(f"   New Speed: {new_speed}x")

        try:
            pack_dir = os.path.join(VOICE_PACKS_DIR, pack_id)
            if not os.path.exists(pack_dir):
                raise ValueError(f"Voice pack {pack_id} not found")

            metadata_path = os.path.join(pack_dir, "metadata.json")
            with open(metadata_path, 'r') as f:
                metadata = json.load(f)

            voice_sample_path = os.path.join(pack_dir, "voice_sample.wav")
            phase_keys = ['left-inhale', 'right-exhale', 'right-inhale', 'left-exhale', 'hold']

            total_files = sum(
                len(metadata["instructions"].get(phase, []))
                for phase in phase_keys
            )

            if operation_id:
                self._update_progress(
                    operation_id=operation_id,
                    status='processing',
                    progress=0.0,
                    message=f'Updating speed to {new_speed}x...',
                    voice_pack_id=pack_id
                )

            files_completed = 0

            for phase_key in phase_keys:
                if phase_key not in metadata["instructions"]:
                    continue

                # Delete old files
                if phase_key in metadata["audio_files"]:
                    for old_file in metadata["audio_files"][phase_key]:
                        old_path = os.path.join(pack_dir, old_file)
                        if os.path.exists(old_path):
                            os.remove(old_path)

                metadata["audio_files"][phase_key] = []
                phase_instructions = metadata["instructions"][phase_key]

                for idx, instruction in enumerate(phase_instructions):
                    text = instruction.strip()
                    if not text:
                        continue

                    filename = f"{phase_key}_variant_{idx}.wav"
                    output_path = os.path.join(pack_dir, filename)

                    self.tts_model.tts_to_file(
                        text=text,
                        file_path=output_path,
                        speaker_wav=voice_sample_path,
                        language=metadata["language"],
                        speed=new_speed
                    )

                    if self._validate_audio_file(output_path):
                        self._normalize_audio(output_path)
                        metadata["audio_files"][phase_key].append(filename)

                    files_completed += 1

                    if operation_id:
                        progress = (files_completed / total_files) * 100.0
                        self._update_progress(
                            operation_id=operation_id,
                            status='processing',
                            progress=progress,
                            message=f'Regenerating at {new_speed}x speed... {int(progress)}%',
                            current_phase=phase_key,
                            voice_pack_id=pack_id
                        )

                    await asyncio.sleep(0.1)

            metadata["speed"] = new_speed
            metadata["updated_at"] = datetime.utcnow().isoformat()

            with open(metadata_path, 'w') as f:
                json.dump(metadata, f, indent=2)

            if operation_id:
                self._update_progress(
                    operation_id=operation_id,
                    status='completed',
                    progress=100.0,
                    message=f'Speed updated to {new_speed}x successfully!',
                    voice_pack_id=pack_id
                )

            logger.info(f"âœ… SPEED UPDATED")
            return metadata

        except Exception as e:
            logger.error(f"âŒ SPEED UPDATE FAILED: {str(e)}", exc_info=True)

            if operation_id:
                self._update_progress(
                    operation_id=operation_id,
                    status='error',
                    progress=0.0,
                    message='Failed to update speed',
                    error_detail=str(e),
                    voice_pack_id=pack_id
                )

            raise

    # ========================================================================
    # OTHER METHODS (unchanged)
    # ========================================================================

    def get_voice_pack(self, pack_id: str) -> Optional[Dict]:
        """
        Get voice pack metadata

        Searches in both user-created and guided voice directories
        """
        try:
            # Try user-created packs first
            metadata_path = os.path.join(VOICE_PACKS_DIR, pack_id, "metadata.json")
            if os.path.exists(metadata_path):
                with open(metadata_path, 'r', encoding='utf-8') as f:
                    return json.load(f)

            # Try guided voices directory
            metadata_path = os.path.join(GUIDED_VOICES_DIR, pack_id, "metadata.json")
            if os.path.exists(metadata_path):
                with open(metadata_path, 'r', encoding='utf-8') as f:
                    return json.load(f)

            return None
        except Exception as e:
            logger.error(f"Failed to get voice pack: {str(e)}")
            return None

    def list_voice_packs(self) -> List[Dict]:
        """
        List all voice packs from both user-created and guided voice directories

        This method reads from:
        1. VOICE_PACKS_DIR (voice_packs/) - User-created voice packs
        2. GUIDED_VOICES_DIR (guided_voices/) - Pre-generated guided packs (e.g., Anulom Vilom)

        Returns:
            List of voice pack summaries with metadata
        """
        packs = []

        def _load_packs_from_directory(directory: str, is_guided: bool = False):
            """Helper function to load packs from a specific directory"""
            if not os.path.exists(directory):
                logger.warning(f"Directory not found: {directory}")
                return []

            loaded_packs = []
            try:
                for pack_id in os.listdir(directory):
                    pack_dir = os.path.join(directory, pack_id)
                    if not os.path.isdir(pack_dir):
                        continue

                    metadata_path = os.path.join(pack_dir, "metadata.json")
                    if os.path.exists(metadata_path):
                        with open(metadata_path, 'r', encoding='utf-8') as f:
                            metadata = json.load(f)

                            # Calculate total_audio_files if not present
                            # Guided voices don't have this field, so we calculate it from audio_files
                            total_audio_files = metadata.get("total_audio_files", 0)
                            if total_audio_files == 0 and "audio_files" in metadata:
                                # Count total audio files from all phases
                                for phase_files in metadata["audio_files"].values():
                                    if isinstance(phase_files, list):
                                        total_audio_files += len(phase_files)

                            # Build pack summary with all relevant fields
                            pack_summary = {
                                "id": metadata["id"],
                                "name": metadata["name"],
                                "created_at": metadata.get("created_at", ""),
                                "total_audio_files": total_audio_files,
                            }

                            # Add optional fields if present (important for guided voices)
                            if "description" in metadata:
                                pack_summary["description"] = metadata["description"]
                            if "language" in metadata:
                                pack_summary["language"] = metadata["language"]
                            if "gender" in metadata:
                                pack_summary["gender"] = metadata["gender"]
                            if "is_default" in metadata:
                                pack_summary["is_default"] = metadata["is_default"]
                            if "breathing_technique" in metadata:
                                pack_summary["breathing_technique"] = metadata["breathing_technique"]
                            if "style" in metadata:
                                pack_summary["style"] = metadata["style"]

                            # Mark guided voices explicitly
                            if is_guided:
                                pack_summary["is_default"] = True  # Guided voices are considered default
                                pack_summary["source"] = "guided"

                            loaded_packs.append(pack_summary)
            except Exception as e:
                logger.error(f"Failed to list packs from {directory}: {str(e)}")

            return loaded_packs

        # Load user-created voice packs
        user_packs = _load_packs_from_directory(VOICE_PACKS_DIR, is_guided=False)
        packs.extend(user_packs)

        # Load guided voice packs (pre-generated)
        guided_packs = _load_packs_from_directory(GUIDED_VOICES_DIR, is_guided=True)
        packs.extend(guided_packs)

        logger.info(f"📋 Listed {len(packs)} voice packs ({len(user_packs)} user, {len(guided_packs)} guided)")

        return packs

    def delete_voice_pack(self, pack_id: str) -> bool:
        """Delete voice pack"""
        try:
            pack_dir = os.path.join(VOICE_PACKS_DIR, pack_id)
            if not os.path.exists(pack_dir):
                return False
            shutil.rmtree(pack_dir)
            logger.info(f"âœ… Voice pack deleted: {pack_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete voice pack: {str(e)}")
            return False

    def get_audio_file_path(self, pack_id: str, phase_key: str, variant_index: int) -> Optional[str]:
        """
        Get audio file path

        Searches in both user-created and guided voice directories
        """
        try:
            logger.debug(f"🔍 Looking for audio: pack={pack_id}, phase={phase_key}, variant={variant_index}")

            metadata = self.get_voice_pack(pack_id)
            if not metadata:
                logger.warning(f"⚠️  Voice pack not found: {pack_id}")
                return None

            if phase_key not in metadata["audio_files"]:
                logger.warning(f"⚠️  Phase key not in metadata: {phase_key}")
                logger.debug(f"Available phases: {list(metadata['audio_files'].keys())}")
                return None

            files = metadata["audio_files"][phase_key]
            if variant_index >= len(files):
                logger.warning(f"⚠️  Variant index out of range: {variant_index} >= {len(files)}")
                return None

            filename = files[variant_index]
            logger.debug(f"📁 Looking for file: {filename}")

            # Try user-created packs first
            file_path = os.path.join(VOICE_PACKS_DIR, pack_id, filename)
            logger.debug(f"Checking user packs: {file_path}")
            if os.path.exists(file_path):
                logger.info(f"✅ Found in user packs: {file_path}")
                return file_path

            # Try guided voices directory
            file_path = os.path.join(GUIDED_VOICES_DIR, pack_id, filename)
            logger.debug(f"Checking guided voices: {file_path}")
            if os.path.exists(file_path):
                logger.info(f"✅ Found in guided voices: {file_path}")
                return file_path

            logger.error(f"❌ Audio file not found in either directory: {filename}")
            return None

        except Exception as e:
            logger.error(f"❌ Failed to get audio file path: {str(e)}", exc_info=True)
            return None
