#include <Arduino.h>
#include <LittleFS.h>
#include "ESP_I2S.h"

// Button wiring:
// GPIO35 -> button -> GND
// INPUT_PULLUP keeps the pin HIGH until the button is pressed.
const int BUTTON_PIN = 35;

// MAX98357A I2S amplifier wiring:
// ESP32-S3 GPIO16 -> DIN
// ESP32-S3 GPIO17 -> BCLK
// ESP32-S3 GPIO18 -> LRC / WS
const int I2S_DIN_PIN = 16;
const int I2S_BCLK_PIN = 17;
const int I2S_LRC_PIN = 18;

const char *SOUND_PATH = "/fahhh.wav";
const unsigned long DEBOUNCE_MS = 40;

I2SClass i2s;

int lastRawButtonState = HIGH;
int stableButtonState = HIGH;
unsigned long lastDebounceTime = 0;

void stopHere() {
  while (true) {
    delay(1000);
  }
}

bool loadFileToMemory(const char *path, uint8_t **buffer, size_t *size) {
  File file = LittleFS.open(path, "r");
  if (!file || file.isDirectory()) {
    Serial.print("Could not open ");
    Serial.println(path);
    return false;
  }

  *size = file.size();
  if (*size == 0) {
    Serial.println("Sound file is empty");
    file.close();
    return false;
  }

  // This prototype clip is small, so loading it fully keeps playback simple.
  *buffer = (uint8_t *)malloc(*size);
  if (*buffer == nullptr) {
    Serial.println("Not enough memory for sound file");
    file.close();
    return false;
  }

  size_t bytesRead = file.read(*buffer, *size);
  file.close();

  if (bytesRead != *size) {
    Serial.println("Could not read whole sound file");
    free(*buffer);
    *buffer = nullptr;
    *size = 0;
    return false;
  }

  return true;
}

void playFahhhOnce() {
  uint8_t *wavData = nullptr;
  size_t wavSize = 0;

  if (!loadFileToMemory(SOUND_PATH, &wavData, &wavSize)) {
    return;
  }

  Serial.println("PLAYING FAHHH");
  i2s.playWAV(wavData, wavSize);
  free(wavData);

  Serial.println("DONE");
}

void handleButton() {
  int rawButtonState = digitalRead(BUTTON_PIN);

  // Restart the debounce timer whenever the raw pin value changes.
  if (rawButtonState != lastRawButtonState) {
    lastDebounceTime = millis();
    lastRawButtonState = rawButtonState;
  }

  // Accept a new button state only after it has stayed stable.
  if ((millis() - lastDebounceTime) > DEBOUNCE_MS) {
    if (rawButtonState != stableButtonState) {
      stableButtonState = rawButtonState;

      // INPUT_PULLUP means LOW is pressed.
      // This edge check prevents a held button from restarting the sound.
      if (stableButtonState == LOW) {
        Serial.println("BUTTON PRESSED");
        playFahhhOnce();
      }
    }
  }
}

void setup() {
  Serial.begin(115200);
  delay(500);

  pinMode(BUTTON_PIN, INPUT_PULLUP);

  if (!LittleFS.begin()) {
    Serial.println("LittleFS mount failed. Upload the data folder first.");
    stopHere();
  }

  if (!LittleFS.exists(SOUND_PATH)) {
    Serial.println("Missing /fahhh.wav. Upload the LittleFS data folder.");
    stopHere();
  }

  i2s.setPins(I2S_BCLK_PIN, I2S_LRC_PIN, I2S_DIN_PIN);

  // The included WAV is mono, 16-bit PCM, 22050 Hz.
  // I2S_STD_SLOT_BOTH sends mono audio to both left and right I2S slots.
  if (!i2s.begin(I2S_MODE_STD, 22050, I2S_DATA_BIT_WIDTH_16BIT, I2S_SLOT_MODE_MONO, I2S_STD_SLOT_BOTH)) {
    Serial.println("I2S init failed");
    stopHere();
  }

  Serial.println("READY");
}

void loop() {
  handleButton();
}
