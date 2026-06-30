#include <Arduino.h>
#include "ESP_I2S.h"
#include "fahhh_wav.h"

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

void playFahhhOnce() {
  Serial.println("PLAYING FAHHH");
  i2s.playWAV(FAHHH_WAV, FAHHH_WAV_SIZE);

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

  i2s.setPins(I2S_BCLK_PIN, I2S_LRC_PIN, I2S_DIN_PIN);

  // The embedded WAV is mono, 16-bit PCM, 22050 Hz.
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
