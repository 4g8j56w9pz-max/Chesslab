# Laser Tag Audio Prototype

Arduino ESP32-S3 prototype for playing the local "fahhh" effect through a MAX98357A I2S amplifier when a button is pressed.

## Files

- `laser-tag-audio.ino` - Arduino sketch.
- `data/fahhh.wav` - LittleFS sound file, converted from `games/lock-pop/assets/miss-fahhh.mp3`.

The included WAV is mono, 16-bit PCM, 22050 Hz.

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
   - `LittleFS` is included with the Espressif `esp32` board package.
   - `ESP_I2S` is included with the Espressif `esp32` board package.
   - No DFPlayer Mini library and no separate audio playback library are used.
4. Install the LittleFS upload tool:
   - Install `arduino-littlefs-upload` from:
     `https://github.com/earlephilhower/arduino-littlefs-upload`
   - Restart Arduino IDE after installing the tool.
5. Open `laser-tag-audio/laser-tag-audio.ino`.
6. Select the board:
   - Tools -> Board -> esp32 -> ESP32S3 Dev Module
7. Set a filesystem partition:
   - Tools -> Partition Scheme -> a scheme that includes LittleFS, such as `Default 4MB with spiffs` or another app/filesystem split available for your board package.
   - Some ESP32 menus still call the filesystem partition `spiffs`; the sketch mounts it as LittleFS.
8. Upload the LittleFS data folder:
   - Keep the sketch folder named `laser-tag-audio`.
   - Confirm `laser-tag-audio/data/fahhh.wav` exists.
   - Use Tools -> Upload LittleFS to Pico/ESP8266/ESP32, or the equivalent LittleFS upload menu item installed by the tool.
9. Upload the sketch:
   - Click Upload in Arduino IDE.
10. Open Serial Monitor:
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

## Rebuilding `data/fahhh.wav`

The source sound in this repository is:

```text
games/lock-pop/assets/miss-fahhh.mp3
```

If you need to regenerate the WAV, use FFmpeg:

```powershell
ffmpeg -y -i games\lock-pop\assets\miss-fahhh.mp3 -ac 1 -ar 22050 -sample_fmt s16 laser-tag-audio\data\fahhh.wav
```

The output should remain mono, 16-bit PCM WAV at 22050 Hz or 16000 Hz.
