# Release Guide — Pear Social Mobile

## Android (APK sideload)

### Prerequisites
- JDK 17
- Android SDK (API 33+), set ANDROID_HOME
- React Native CLI: `npm install -g react-native-cli`

### Generate release keystore (one-time)
```bash
keytool -genkey -v -keystore pear-social.keystore \
  -alias pear-social -keyalg RSA -keysize 2048 -validity 10000
```
Store the keystore at `android/app/pear-social.keystore`. Keep it secret.

### Configure signing in android/app/build.gradle
Add to `android { signingConfigs { ... } }`:
```gradle
release {
    storeFile file('pear-social.keystore')
    storePassword System.getenv('KEYSTORE_PASSWORD')
    keyAlias 'pear-social'
    keyPassword System.getenv('KEY_PASSWORD')
}
```
Set `buildTypes.release.signingConfig signingConfigs.release`.

### Build
```bash
export KEYSTORE_PASSWORD=yourpassword
export KEY_PASSWORD=yourpassword
npm run build:android
```
Output: `android/app/build/outputs/apk/release/app-release.apk`

### Install on device
```bash
adb install android/app/build/outputs/apk/release/app-release.apk
```

---

## iOS (TestFlight)

These steps require a Mac with Xcode 15+ and an Apple Developer account.

1. Open `ios/pearSocialMobile.xcworkspace` in Xcode
2. Set **Bundle Identifier**: `com.pearteam.pearsocial`
3. Set **Team** to your Apple Developer account
4. Select **Any iOS Device (arm64)** as the target
5. **Product → Archive** (this may take several minutes)
6. In the Organizer that opens, click **Distribute App**
7. Select **TestFlight & App Store** → **Next**
8. Upload to App Store Connect
9. In App Store Connect, go to **TestFlight** tab
10. Add internal or external testers

### Requirements
- Valid Apple Developer Program membership ($99/year)
- App registered in App Store Connect with bundle ID `com.pearteam.pearsocial`

---

## Troubleshooting

**Metro bundler port conflict**: Run `npx react-native start --reset-cache`

**Hypercore native build fails on Android**: Ensure NDK version r25c is installed via Android SDK Manager

**react-native-bare-kit not linking**: Run `cd android && ./gradlew clean` then rebuild
