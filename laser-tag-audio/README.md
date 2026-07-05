# Laser Tag Audio Prototype

Arduino ESP32-S3 prototype for playing the local "fahhh" effect through a MAX98357A I2S amplifier when a button is pressed.

## Files

- `laser-tag-audio.ino` - Arduino sketch.
- `fahhh_wav.h` - embedded WAV byte array stored in `PROGMEM`.

The embedded WAV was converted from `games/lock-pop/assets/miss-fahhh.mp3`. It is mono, 16-bit PCM, 22050 Hz.

The larger sound library is available in:

- `games/soundboard/audio/wav/` - mono 16-bit PCM WAV files.
- `games/soundboard/audio/headers/` - matching Arduino `PROGMEM` headers.
- `games/soundboard/audio/manifest.json` - labels, paths, symbols, and byte sizes.

## Wiring

Button:

- One side of button: GPIO35
- Other side of button: GND
- Sketch uses `INPUT_PULLUP`, so pressed reads LOW.

MAX98357A:

- DIN: GPIO16
- BCLK: GPIO17
- LRC / WS: GPIO18
- VIN: 5V
- GND: GND
- Speaker: MAX98357A screw terminals

Audio path: ESP32-S3 -> I2S -> MAX98357A -> speaker. Do not connect the speaker directly to ESP32 GPIO.

## Arduino IDE Setup

1. Install Arduino IDE 2.x.
2. Install the board package:
   - Open File -> Preferences.
   - Add this Boards Manager URL:
     `https://espressif.github.io/arduino-esp32/package_esp32_index.json`
   - Open Tools -> Board -> Boards Manager.
   - Install `esp32` by Espressif Systems.
   - This sketch targets the ESP32 Arduino core 3.x API. It was written against the local 3.3.10 core.
3. Required libraries and tools:
   - `ESP_I2S` is included with the Espressif `esp32` board package.
   - No DFPlayer Mini library and no separate audio playback library are used.
4. Open `laser-tag-audio/laser-tag-audio.ino`.
5. Select the board:
   - Tools -> Board -> esp32 -> ESP32S3 Dev Module
6. Upload the sketch:
   - Click Upload in Arduino IDE.
7. Open Serial Monitor:
   - Baud rate: `115200`
   - Expected boot message after setup: `READY`

## Expected Serial Output

On boot:

```text
READY
```

On one button press:

```text
BUTTON PRESSED
PLAYING FAHHH
DONE
```

Holding the button down should not repeatedly restart the sound. Release and press again to replay it.

## Using a Library Sound on Hardware

Each generated header contains a byte array and a matching size symbol. For example:

```cpp
#include "laser-shot_wav.h"
```

Then play it with the same `ESP_I2S` API already used by this sketch:

```cpp
i2s.playWAV(LASER_SHOT_WAV, LASER_SHOT_WAV_SIZE);
```

Keep the I2S pin constants matched to the actual MAX98357A wiring for the hardware build you are testing.

## Rebuilding the Sound Library

Run this from the repository root:

```powershell
npm run audio:library
```

That regenerates:

- `games/soundboard/audio/wav/*.wav`
- `games/soundboard/audio/headers/*_wav.h`
- `games/soundboard/audio/manifest.json`

## Converting a Custom Audio File

The converter expects a mono, 16-bit PCM WAV. If your source is MP3 or another format, convert it first:

```powershell
ffmpeg -y -i path\to\source.mp3 -ac 1 -ar 22050 -sample_fmt s16 path\to\output.wav
```

Then convert the WAV into a C/C++ header:

```powershell
npm run audio:header -- path\to\output.wav laser-tag-audio\custom_wav.h CUSTOM_WAV
```

Use the generated symbols in the sketch:

```cpp
#include "custom_wav.h"
i2s.playWAV(CUSTOM_WAV, CUSTOM_WAV_SIZE);
```
