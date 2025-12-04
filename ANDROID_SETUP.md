# הכנת הפרויקט לאנדרואיד

הפרויקט עדיין לא מוכן לבניית Android. יש לבצע את השלבים הבאים:

## דרישות מקדימות

### 1. התקן Android Studio
הורד והתקן מ: https://developer.android.com/studio

### 2. התקן Android SDK & NDK
דרך Android Studio:
- פתח Android Studio → Settings → Appearance & Behavior → System Settings → Android SDK
- בטאב "SDK Platforms": התקן Android 13.0 (API 33) או גבוה יותר
- בטאב "SDK Tools": התקן:
  - Android SDK Build-Tools
  - Android SDK Command-line Tools
  - Android SDK Platform-Tools
  - NDK (Side by side) - גרסה 26.1.10909125

### 3. הגדר משתני סביבה

**Windows (PowerShell):**
```powershell
$env:ANDROID_HOME = "C:\Users\<USERNAME>\AppData\Local\Android\Sdk"
$env:NDK_HOME = "$env:ANDROID_HOME\ndk\26.1.10909125"
```

הוסף ל-PATH:
```powershell
$env:PATH += ";$env:ANDROID_HOME\platform-tools"
$env:PATH += ";$env:ANDROID_HOME\cmdline-tools\latest\bin"
```

**Linux/Mac:**
```bash
export ANDROID_HOME=$HOME/Android/Sdk
export NDK_HOME=$ANDROID_HOME/ndk/26.1.10909125
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin
```

### 4. התקן Rust targets לאנדרואיד
```bash
rustup target add aarch64-linux-android
rustup target add armv7-linux-androideabi
rustup target add x86_64-linux-android
rustup target add i686-linux-android
```

### 5. התקן Java JDK 17
הורד והתקן מ: https://adoptium.net/

## אתחול הפרויקט לאנדרואיד

### שלב 1: אתחל את תמיכת Android
```bash
npm run tauri android init
```

הפקודה תשאל מספר שאלות:
- **App name**: Smart Player
- **App identifier**: com.smartplayer.app (או כל identifier שתרצה)
- **Target SDK**: 33 (או גבוה יותר)

### שלב 2: עדכן הרשאות Android
ערוך את `src-tauri/gen/android/app/src/main/AndroidManifest.xml` והוסף:

```xml
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
```

### שלב 3: בדוק שהכל עובד
```bash
# בדיקה בסיסית (רץ על אמולטור או מכשיר מחובר)
npm run tauri android dev

# בניית APK לארכיטקטורה ספציפית
npm run tauri android build -- --target aarch64 --apk

# או בניית APK אוניברסלי (עובד על כל המכשירים)
npm run tauri android build -- --target universal --apk
```

**הערה**: 
- `aarch64` - למכשירים מודרניים (64-bit) - מומלץ
- `armv7` - למכשירים ישנים (32-bit)
- `universal` - עובד על כולם אבל גדול יותר

## פתרון בעיות נפוצות

### שגיאה: "Android SDK not found"
- ודא ש-ANDROID_HOME מוגדר נכון
- הפעל מחדש את הטרמינל/IDE

### שגיאה: "NDK not found"
- ודא ש-NDK_HOME מוגדר נכון
- התקן NDK דרך Android Studio SDK Manager

### שגיאה: "Rust target not found"
```bash
rustup target add aarch64-linux-android
```

### שגיאה בבניה: "Could not find gradle"
- ודא ש-Android Studio מותקן
- הפעל מחדש את הטרמינל

### APK לא נבנה
- בדוק שיש מספיק מקום בדיסק (לפחות 10GB)
- נסה לנקות: `npm run tauri android build -- --target aarch64 --apk --clean`

## בדיקה על מכשיר

### אפשר USB Debugging
1. הגדרות → אודות הטלפון
2. לחץ 7 פעמים על "מספר גרסה"
3. חזור להגדרות → אפשרויות מפתח
4. הפעל "USB debugging"

### התקן APK
```bash
# מצא את ה-APK
cd src-tauri/gen/android/app/build/outputs/apk/universal/release

# התקן
adb install app-universal-release.apk
```

## הערות חשובות

1. **גודל APK**: ה-APK יהיה גדול (~50-100MB) כי הוא כולל את כל הספריות
2. **ביצועים**: ייתכנו הבדלי ביצועים בין Windows ל-Android
3. **הרשאות**: המשתמש יצטרך לאשר הרשאות בהתקנה ראשונה
4. **אחסון**: האפליקציה תשתמש באחסון הפנימי של Android

## לאחר האתחול

לאחר שהרצת `tauri android init` בהצלחה:
1. הקובץ `src-tauri/gen/android` ייווצר
2. ה-workflows ב-GitHub Actions יוכלו לבנות Android
3. תוכל להריץ `npm run tauri android dev` לפיתוח
4. תוכל לבנות APK עם `npm run tauri android build -- --target aarch64 --apk`

## עזרה נוספת

- [Tauri Mobile Documentation](https://v2.tauri.app/develop/mobile/)
- [Android Developer Guide](https://developer.android.com/guide)
