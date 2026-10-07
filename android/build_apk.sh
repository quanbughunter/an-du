#!/usr/bin/env bash
# Build Ăn Đủ APK without Gradle: aapt → javac → dx → zipalign → apksigner
set -euo pipefail
cd "$(dirname "$0")"
SDK=/usr/lib/android-sdk/platforms/android-23/android.jar
[ -f "$SDK" ] || SDK=$(ls /usr/lib/android-sdk/platforms/*/android.jar | head -1)
OUT=out; rm -rf "$OUT"; mkdir -p "$OUT"/{gen,obj,assets/www}
cp ../dist/apk-www/index.html "$OUT/assets/www/index.html"
VERSION_NAME=${VERSION_NAME:-1.0.0}; VERSION_CODE=${VERSION_CODE:-1}
aapt package -f -m -J "$OUT/gen" -M AndroidManifest.xml -S res -A "$OUT/assets" -I "$SDK" \
  --min-sdk-version 21 --target-sdk-version 34 --version-code "$VERSION_CODE" --version-name "$VERSION_NAME" \
  -F "$OUT/app.unsigned.apk"
javac -nowarn -Xlint:-options -source 8 -target 8 -encoding UTF-8 -bootclasspath "$SDK" -d "$OUT/obj" \
  $(find src "$OUT/gen" -name '*.java')
dalvik-exchange --dex --min-sdk-version=21 --output="$OUT/classes.dex" "$OUT/obj"
(cd "$OUT" && aapt add -f app.unsigned.apk classes.dex >/dev/null)
zipalign -f -p 4 "$OUT/app.unsigned.apk" "$OUT/app.aligned.apk"
KS=keystore/an-du-release.jks
if [ ! -f "$KS" ]; then
  mkdir -p keystore
  PASS=$(head -c 18 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 20)
  echo "$PASS" > keystore/PASSWORD.txt
  keytool -genkeypair -keystore "$KS" -storepass "$PASS" -keypass "$PASS" -alias andu -keyalg RSA -keysize 2048 \
    -validity 10000 -dname "CN=An Du, O=quanbughunter, C=VN" >/dev/null 2>&1
fi
PASS=$(cat keystore/PASSWORD.txt)
apksigner sign --ks "$KS" --ks-pass "pass:$PASS" --key-pass "pass:$PASS" --ks-key-alias andu \
  --min-sdk-version 21 --out "$OUT/AnDu-$VERSION_NAME.apk" "$OUT/app.aligned.apk"
apksigner verify --verbose --min-sdk-version 21 "$OUT/AnDu-$VERSION_NAME.apk" | head -6
ls -la "$OUT/AnDu-$VERSION_NAME.apk"
