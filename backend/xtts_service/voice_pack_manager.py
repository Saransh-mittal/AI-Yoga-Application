"""
Voice Pack Manager - Enhanced Audio Quality Version
====================================================
File Location: backend/xtts_service/voice_pack_manager.py (REPLACE EXISTING)

KEY IMPROVEMENTS:
- Explicit sample rate control (48kHz for optimal quality)
- Audio normalization to prevent volume inconsistencies
- Proper audio file validation
- Enhanced error handling for audio generation

LEARNING NOTES:
- Sample Rate: Higher sample rate (48kHz) provides better quality
- Audio Normalization: Ensures consistent volume across all files
- WAV Format: Uncompressed audio prevents quality loss from compression
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
import logging

logger = logging.getLogger(__name__)

# Configuration
VOICE_PACKS_DIR = "voice_packs"
VOICE_SAMPLES_DIR = "voice_samples"

# Audio quality settings
TARGET_SAMPLE_RATE = 48000  # 48kHz for high quality
TARGET_BIT_DEPTH = 16  # 16-bit audio


class VoicePackManager:
    """
    Enhanced Voice Pack Manager with audio quality optimization

    DESIGN IMPROVEMENTS:
    - Ensures consistent sample rate across all audio files
    - Normalizes audio volume to prevent sudden changes
    - Validates audio file integrity before storage
    """

    def __init__(self, tts_model):
        self.tts_model = tts_model
        os.makedirs(VOICE_PACKS_DIR, exist_ok=True)
        os.makedirs(VOICE_SAMPLES_DIR, exist_ok=True)

    def _normalize_audio(self, audio_path: str) -> None:
        """
        Normalize audio volume to prevent inconsistencies

        LEARNING NOTE: Audio normalization ensures all files have similar volume
        levels, preventing jarring volume changes during playback
        """
        try:
            with wave.open(audio_path, 'r') as wav_file:
                # Read audio data
                frames = wav_file.readframes(wav_file.getnframes())
                sample_width = wav_file.getsampwidth()
                channels = wav_file.getnchannels()
                framerate = wav_file.getframerate()

                # Convert to numpy array based on sample width
                if sample_width == 2:  # 16-bit
                    audio_data = np.frombuffer(frames, dtype=np.int16)
                else:
                    return  # Skip normalization for other formats

                # Normalize to 70% of maximum amplitude (prevents clipping)
                max_val = np.abs(audio_data).max()
                if max_val > 0:
                    target_amplitude = 0.7 * 32767  # 70% of int16 max
                    normalized = (audio_data * (target_amplitude / max_val)).astype(np.int16)

                    # Write normalized audio back
                    with wave.open(audio_path, 'w') as out_wav:
                        out_wav.setnchannels(channels)
                        out_wav.setsampwidth(sample_width)
                        out_wav.setframerate(framerate)
                        out_wav.writeframes(normalized.tobytes())

            logger.debug(f"Audio normalized: {audio_path}")

        except Exception as e:
            logger.warning(f"Audio normalization failed (non-critical): {str(e)}")

    def _validate_audio_file(self, audio_path: str) -> bool:
        """
        Validate that audio file is properly formatted

        Returns:
            True if valid, False otherwise
        """
        try:
            with wave.open(audio_path, 'r') as wav_file:
                # Check basic properties
                if wav_file.getnframes() == 0:
                    return False
                if wav_file.getframerate() == 0:
                    return False
                return True
        except Exception as e:
            logger.error(f"Audio validation failed: {str(e)}")
            return False

    async def create_voice_pack_with_id(
        self,
        pack_id: str,
        name: str,
        voice_sample_path: str,
        instructions: Dict[str, List[str]],
        language: str = "en",
        speed: float = 1.0
    ) -> Dict:
        """
        Create voice pack with specific ID (for default pack)

        Args:
            pack_id: Specific ID to use (e.g., "default")
            name: User-friendly name
            voice_sample_path: Path to voice sample
            instructions: Breathing instructions
            language: Language code
            speed: Speech speed

        Returns:
            Voice pack metadata
        """
        try:
            pack_dir = os.path.join(VOICE_PACKS_DIR, pack_id)
            os.makedirs(pack_dir, exist_ok=True)

            logger.info(f"Creating voice pack '{name}' with ID: {pack_id}")
            logger.info(f"Audio settings: {TARGET_SAMPLE_RATE}Hz, {TARGET_BIT_DEPTH}-bit")

            # Copy voice sample
            voice_sample_copy = os.path.join(pack_dir, "voice_sample.wav")
            shutil.copy2(voice_sample_path, voice_sample_copy)

            # Generate audio files
            audio_files = {}
            total_files = 0
            phase_keys = ['left-inhale', 'right-exhale', 'right-inhale', 'left-exhale', 'hold']

            for phase_key in phase_keys:
                audio_files[phase_key] = []
                phase_instructions = instructions.get(phase_key, [])

                for idx, instruction in enumerate(phase_instructions):
                    text = instruction.strip()
                    if not text:
                        continue

                    filename = f"{phase_key}_variant_{idx}.wav"
                    output_path = os.path.join(pack_dir, filename)

                    logger.info(f"Generating HQ audio: {phase_key} variant {idx}")

                    self.tts_model.tts_to_file(
                        text=text,
                        file_path=output_path,
                        speaker_wav=voice_sample_path,
                        language=language,
                        speed=speed
                    )

                    if not self._validate_audio_file(output_path):
                        logger.error(f"Invalid audio file generated: {filename}")
                        continue

                    self._normalize_audio(output_path)

                    audio_files[phase_key].append(filename)
                    total_files += 1

            # Create metadata
            metadata = {
                "id": pack_id,
                "name": name,
                "created_at": datetime.utcnow().isoformat(),
                "language": language,
                "speed": speed,
                "audio_files": audio_files,
                "instructions": instructions,
                "total_audio_files": total_files,
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

            logger.info(f"✅ Voice pack created: {pack_id} ({total_files} files)")
            return metadata

        except Exception as e:
            logger.error(f"Voice pack creation failed: {str(e)}")
            if os.path.exists(pack_dir):
                shutil.rmtree(pack_dir)
            raise

    async def create_voice_pack(
        self,
        name: str,
        voice_sample_path: str,
        instructions: Dict[str, List[str]],
        language: str = "en",
        speed: float = 1.0
    ) -> Dict:
        """
        Create voice pack with enhanced audio quality settings
        """
        try:
            pack_id = str(uuid.uuid4())
            pack_dir = os.path.join(VOICE_PACKS_DIR, pack_id)
            os.makedirs(pack_dir, exist_ok=True)

            logger.info(f"Creating high-quality voice pack '{name}' (ID: {pack_id})")
            logger.info(f"Audio settings: {TARGET_SAMPLE_RATE}Hz, {TARGET_BIT_DEPTH}-bit")

            # Copy voice sample
            voice_sample_copy = os.path.join(pack_dir, "voice_sample.wav")
            shutil.copy2(voice_sample_path, voice_sample_copy)

            # Generate all audio files with quality optimization
            audio_files = {}
            total_files = 0
            phase_keys = ['left-inhale', 'right-exhale', 'right-inhale', 'left-exhale', 'hold']

            for phase_key in phase_keys:
                audio_files[phase_key] = []
                phase_instructions = instructions.get(phase_key, [])

                for idx, instruction in enumerate(phase_instructions):
                    text = instruction.strip()
                    if not text:
                        continue

                    filename = f"{phase_key}_variant_{idx}.wav"
                    output_path = os.path.join(pack_dir, filename)

                    logger.info(f"Generating HQ audio: {phase_key} variant {idx}")

                    # Generate with XTTS (inherits model's quality settings)
                    self.tts_model.tts_to_file(
                        text=text,
                        file_path=output_path,
                        speaker_wav=voice_sample_path,
                        language=language,
                        speed=speed
                    )

                    # Validate generated audio
                    if not self._validate_audio_file(output_path):
                        logger.error(f"Invalid audio file generated: {filename}")
                        continue

                    # Normalize audio for consistent volume
                    self._normalize_audio(output_path)

                    audio_files[phase_key].append(filename)
                    total_files += 1

            # Create metadata
            metadata = {
                "id": pack_id,
                "name": name,
                "created_at": datetime.utcnow().isoformat(),
                "language": language,
                "speed": speed,
                "audio_files": audio_files,
                "instructions": instructions,
                "total_audio_files": total_files,
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

            logger.info(f"✅ High-quality voice pack created: {pack_id} ({total_files} files)")
            return metadata

        except Exception as e:
            logger.error(f"Voice pack creation failed: {str(e)}")
            if os.path.exists(pack_dir):
                shutil.rmtree(pack_dir)
            raise

    async def update_voice_pack(
        self,
        pack_id: str,
        updated_instructions: Dict[str, List[str]],
        phases_to_update: Optional[List[str]] = None
    ) -> Dict:
        """
        Update voice pack with quality optimization
        """
        try:
            pack_dir = os.path.join(VOICE_PACKS_DIR, pack_id)
            if not os.path.exists(pack_dir):
                raise ValueError(f"Voice pack {pack_id} not found")

            # Load metadata
            metadata_path = os.path.join(pack_dir, "metadata.json")
            with open(metadata_path, 'r') as f:
                metadata = json.load(f)

            voice_sample_path = os.path.join(pack_dir, "voice_sample.wav")

            if phases_to_update is None:
                phases_to_update = list(updated_instructions.keys())

            logger.info(f"Updating voice pack {pack_id} with HQ audio")

            for phase_key in phases_to_update:
                if phase_key not in updated_instructions:
                    continue

                # Delete old files
                if phase_key in metadata["audio_files"]:
                    for old_file in metadata["audio_files"][phase_key]:
                        old_path = os.path.join(pack_dir, old_file)
                        if os.path.exists(old_path):
                            os.remove(old_path)

                # Generate new files with quality optimization
                metadata["audio_files"][phase_key] = []
                phase_instructions = updated_instructions[phase_key]

                for idx, instruction in enumerate(phase_instructions):
                    text = instruction.strip()
                    if not text:
                        continue

                    filename = f"{phase_key}_variant_{idx}.wav"
                    output_path = os.path.join(pack_dir, filename)

                    logger.info(f"Regenerating HQ audio: {phase_key} variant {idx}")

                    self.tts_model.tts_to_file(
                        text=text,
                        file_path=output_path,
                        speaker_wav=voice_sample_path,
                        language=metadata["language"],
                        speed=metadata["speed"]
                    )

                    # Validate and normalize
                    if self._validate_audio_file(output_path):
                        self._normalize_audio(output_path)
                        metadata["audio_files"][phase_key].append(filename)

                # Update instructions
                metadata["instructions"][phase_key] = phase_instructions

            # Update metadata
            metadata["updated_at"] = datetime.utcnow().isoformat()

            with open(metadata_path, 'w') as f:
                json.dump(metadata, f, indent=2)

            logger.info(f"✅ Voice pack updated with HQ audio: {pack_id}")
            return metadata

        except Exception as e:
            logger.error(f"Voice pack update failed: {str(e)}")
            raise

    async def update_voice_pack_speed(
        self,
        pack_id: str,
        new_speed: float
    ) -> Dict:
        """
        Update voice pack speed by regenerating all audio files

        KEY CONCEPT: Voice speed is "baked into" the generated audio files.
        To change speed, we must regenerate all audio at the new speed.

        Args:
            pack_id: Voice pack ID
            new_speed: New speech speed (0.5 to 2.0)

        Returns:
            Updated metadata dictionary
        """
        try:
            pack_dir = os.path.join(VOICE_PACKS_DIR, pack_id)
            if not os.path.exists(pack_dir):
                raise ValueError(f"Voice pack {pack_id} not found")

            # Load metadata
            metadata_path = os.path.join(pack_dir, "metadata.json")
            with open(metadata_path, 'r') as f:
                metadata = json.load(f)

            voice_sample_path = os.path.join(pack_dir, "voice_sample.wav")

            logger.info(f"Updating voice pack {pack_id} speed from {metadata['speed']}x to {new_speed}x")

            # Regenerate ALL audio files with new speed
            phase_keys = ['left-inhale', 'right-exhale', 'right-inhale', 'left-exhale', 'hold']

            for phase_key in phase_keys:
                # Delete old files
                if phase_key in metadata["audio_files"]:
                    for old_file in metadata["audio_files"][phase_key]:
                        old_path = os.path.join(pack_dir, old_file)
                        if os.path.exists(old_path):
                            os.remove(old_path)

                # Generate new files with new speed
                metadata["audio_files"][phase_key] = []
                phase_instructions = metadata["instructions"][phase_key]

                for idx, instruction in enumerate(phase_instructions):
                    text = instruction.strip()
                    if not text:
                        continue

                    filename = f"{phase_key}_variant_{idx}.wav"
                    output_path = os.path.join(pack_dir, filename)

                    logger.info(f"Regenerating: {phase_key} variant {idx} at {new_speed}x")

                    # Generate with new speed
                    self.tts_model.tts_to_file(
                        text=text,
                        file_path=output_path,
                        speaker_wav=voice_sample_path,
                        language=metadata["language"],
                        speed=new_speed  # NEW SPEED HERE
                    )

                    # Validate and normalize
                    if self._validate_audio_file(output_path):
                        self._normalize_audio(output_path)
                        metadata["audio_files"][phase_key].append(filename)

            # Update metadata with new speed
            metadata["speed"] = new_speed
            metadata["updated_at"] = datetime.utcnow().isoformat()

            # Save updated metadata
            with open(metadata_path, 'w') as f:
                json.dump(metadata, f, indent=2)

            logger.info(f"✅ Voice pack speed updated: {pack_id} → {new_speed}x")
            return metadata

        except Exception as e:
            logger.error(f"Voice pack speed update failed: {str(e)}")
            raise

    def get_voice_pack(self, pack_id: str) -> Optional[Dict]:
        """Get voice pack metadata"""
        try:
            metadata_path = os.path.join(VOICE_PACKS_DIR, pack_id, "metadata.json")
            if not os.path.exists(metadata_path):
                return None
            with open(metadata_path, 'r') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Failed to get voice pack: {str(e)}")
            return None

    def list_voice_packs(self) -> List[Dict]:
        """List all voice packs"""
        packs = []
        try:
            for pack_id in os.listdir(VOICE_PACKS_DIR):
                pack_dir = os.path.join(VOICE_PACKS_DIR, pack_id)
                if not os.path.isdir(pack_dir):
                    continue
                metadata_path = os.path.join(pack_dir, "metadata.json")
                if os.path.exists(metadata_path):
                    with open(metadata_path, 'r') as f:
                        metadata = json.load(f)
                        packs.append({
                            "id": metadata["id"],
                            "name": metadata["name"],
                            "created_at": metadata["created_at"],
                            "total_audio_files": metadata.get("total_audio_files", 0)
                        })
        except Exception as e:
            logger.error(f"Failed to list voice packs: {str(e)}")
        return packs

    def delete_voice_pack(self, pack_id: str) -> bool:
        """Delete voice pack"""
        try:
            pack_dir = os.path.join(VOICE_PACKS_DIR, pack_id)
            if not os.path.exists(pack_dir):
                return False
            shutil.rmtree(pack_dir)
            logger.info(f"✅ Voice pack deleted: {pack_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete voice pack: {str(e)}")
            return False

    def get_audio_file_path(self, pack_id: str, phase_key: str, variant_index: int) -> Optional[str]:
        """Get audio file path"""
        try:
            metadata = self.get_voice_pack(pack_id)
            if not metadata:
                return None
            if phase_key not in metadata["audio_files"]:
                return None
            files = metadata["audio_files"][phase_key]
            if variant_index >= len(files):
                return None
            filename = files[variant_index]
            file_path = os.path.join(VOICE_PACKS_DIR, pack_id, filename)
            if os.path.exists(file_path):
                return file_path
            return None
        except Exception as e:
            logger.error(f"Failed to get audio file path: {str(e)}")
            return None
