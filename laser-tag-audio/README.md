# Laser Tag Audio Prototype

Arduino ESP32-S3 prototype for playing the local "fahhh" effect through a MAX98357A I2S amplifier when a button is pressed.

## Files

- `laser-tag-audio.ino` - Arduino sketch.
- `fahhh_wav.h` - embedded WAV byte array stored in `PROGMEM`.

The embedded WAV was converted from `games/lock-pop/assets/miss-fahhh.mp3`. It is mono, 16-bit PCM, 22050 Hz.

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

## Rebuilding `fahhh_wav.h`

The source sound in this repository is:

```text
games/lock-pop/assets/miss-fahhh.mp3
```

If you need to regenerate the WAV, use FFmpeg:

```powershell
ffmpeg -y -i games\lock-pop\assets\miss-fahhh.mp3 -ac 1 -ar 22050 -sample_fmt s16 laser-tag-audio\fahhh.wav
```

Then convert the WAV into a C header:

```powershell
$bytes = [System.IO.File]::ReadAllBytes('laser-tag-audio\fahhh.wav')
$out = [System.Text.StringBuilder]::new()
[void]$out.AppendLine('#pragma once')
[void]$out.AppendLine('')
[void]$out.AppendLine('#include <Arduino.h>')
[void]$out.AppendLine('')
[void]$out.AppendLine('const uint8_t FAHHH_WAV[] PROGMEM = {')
for ($i = 0; $i -lt $bytes.Length; $i += 12) {
  $count = [Math]::Min(12, $bytes.Length - $i)
  $parts = for ($j = 0; $j -lt $count; $j++) { '0x{0:X2}' -f $bytes[$i + $j] }
  $suffix = if (($i + $count) -lt $bytes.Length) { ',' } else { '' }
  [void]$out.AppendLine('  ' + ($parts -join ', ') + $suffix)
}
[void]$out.AppendLine('};')
[void]$out.AppendLine('')
[void]$out.AppendLine('const size_t FAHHH_WAV_SIZE = sizeof(FAHHH_WAV);')
[System.IO.File]::WriteAllText('laser-tag-audio\fahhh_wav.h', $out.ToString(), [System.Text.Encoding]::ASCII)
```

The temporary `laser-tag-audio\fahhh.wav` file is only for rebuilding the header and is not needed for normal sketch upload.
