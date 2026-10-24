// OffGuard roadside unit: ESP32 + crossing lamps, buzzer, 16x2 LCD sign,
// servo warning gate and a PIR motion sensor.
//
// Listens on a public MQTT broker for alerts from the OffGuard server:
//   <prefix>/alert  {"line1":"EXIT 64 DEER","line2":"SLOW DOWN NOW",...}
//   <prefix>/clear  {}
// and reports its own PIR trips on <prefix>/motion.
//
// Runs in the Wokwi simulator (https://wokwi.com) on its guest WiFi.

#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <LiquidCrystal_I2C.h>
#include <ESP32Servo.h>

// Must match MQTT_PREFIX in the server's .env
const char *MQTT_PREFIX = "offguard/og-7k3q9x";
const char *MQTT_HOST = "broker.hivemq.com";
const int MQTT_PORT = 1883;
const char *UNIT_SENSOR_ID = "exit-64"; // which exit this unit stands at
const char *UNIT_LABEL = "EXIT 64 MEDFORD";

const int LAMP_A = 25;
const int LAMP_B = 26;
const int BUZZER = 27;
const int GATE_PIN = 18;
const int PIR_PIN = 34;

const int GATE_UP = 90;   // degrees
const int GATE_DOWN = 0;
const unsigned long ALERT_MS = 30000;   // how long the unit stays in alert
const unsigned long MOTION_COOLDOWN_MS = 10000;

WiFiClient wifi;
PubSubClient mqtt(wifi);
LiquidCrystal_I2C lcd(0x27, 16, 2);
Servo gate;

String topicAlert, topicClear, topicMotion;
bool alerting = false;
unsigned long alertUntil = 0;
unsigned long lastMotion = 0;
int lastPir = LOW;

void showLcd(const String &a, const String &b) {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print(a.substring(0, 16));
  lcd.setCursor(0, 1);
  lcd.print(b.substring(0, 16));
}

void allClear() {
  alerting = false;
  digitalWrite(LAMP_A, LOW);
  digitalWrite(LAMP_B, LOW);
  noTone(BUZZER);
  gate.write(GATE_UP);
  showLcd(UNIT_LABEL, "ALL CLEAR");
}

void startAlert(const String &line1, const String &line2) {
  alerting = true;
  alertUntil = millis() + ALERT_MS;
  showLcd("! " + line1, line2);
  gate.write(GATE_DOWN);
}

void onMessage(char *topic, byte *payload, unsigned int len) {
  String t(topic);
  Serial.printf("MQTT %s (%u bytes)\n", topic, len);
  if (t == topicClear) {
    allClear();
    return;
  }
  if (t == topicAlert) {
    JsonDocument doc;
    if (deserializeJson(doc, payload, len)) {
      startAlert("ANIMAL AHEAD", "SLOW DOWN NOW");
      return;
    }
    startAlert(doc["line1"] | "ANIMAL AHEAD", doc["line2"] | "SLOW DOWN NOW");
  }
}

void connectWifi() {
  showLcd("OFFGUARD", "WIFI...");
  WiFi.begin("Wokwi-GUEST", "", 6);
  while (WiFi.status() != WL_CONNECTED) {
    delay(200);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected");
}

void connectMqtt() {
  while (!mqtt.connected()) {
    showLcd("OFFGUARD", "LINKING...");
    String id = "offguard-unit-" + String((uint32_t)ESP.getEfuseMac(), HEX);
    if (mqtt.connect(id.c_str())) {
      mqtt.subscribe(topicAlert.c_str());
      mqtt.subscribe(topicClear.c_str());
      Serial.println("MQTT connected, listening on " + String(MQTT_PREFIX) + "/*");
      allClear();
    } else {
      Serial.printf("MQTT failed (%d), retrying\n", mqtt.state());
      delay(2000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(LAMP_A, OUTPUT);
  pinMode(LAMP_B, OUTPUT);
  pinMode(BUZZER, OUTPUT);
  pinMode(PIR_PIN, INPUT);
  gate.attach(GATE_PIN);
  gate.write(GATE_UP);
  lcd.init();
  lcd.backlight();

  topicAlert = String(MQTT_PREFIX) + "/alert";
  topicClear = String(MQTT_PREFIX) + "/clear";
  topicMotion = String(MQTT_PREFIX) + "/motion";

  connectWifi();
  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setCallback(onMessage);
  connectMqtt();
}

void loop() {
  if (!mqtt.connected()) connectMqtt();
  mqtt.loop();

  // Local motion sensor: report it so the server can raise a detection.
  int pir = digitalRead(PIR_PIN);
  if (pir == HIGH && lastPir == LOW && millis() - lastMotion > MOTION_COOLDOWN_MS) {
    lastMotion = millis();
    String msg = String("{\"sensorId\":\"") + UNIT_SENSOR_ID + "\"}";
    mqtt.publish(topicMotion.c_str(), msg.c_str());
    Serial.println("PIR motion -> reported to OffGuard");
    startAlert("MOTION DETECTED", "CHECKING...");
  }
  lastPir = pir;

  if (alerting) {
    // Alternate the two lamps every 500 ms, like a railroad crossing.
    bool phase = (millis() / 500) % 2;
    digitalWrite(LAMP_A, phase ? HIGH : LOW);
    digitalWrite(LAMP_B, phase ? LOW : HIGH);
    // Crossing bell: short ding once per second.
    if (millis() % 1000 < 120) tone(BUZZER, 1400);
    else noTone(BUZZER);
    if (millis() > alertUntil) allClear();
  }
  delay(10);
}
