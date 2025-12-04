# מדריך יצירת Release

## איך ליצור גרסה חדשה

### דרך 1: באמצעות Git Tag (מומלץ)

1. עדכן את מספר הגרסה ב-`src-tauri/tauri.conf.json`:
```json
{
  "version": "1.0.0"
}
```

2. צור commit ו-tag:
```bash
git add .
git commit -m "Release v1.0.0"
git tag v1.0.0
git push origin main --tags
```

3. ה-workflow יתחיל אוטומטית ויצור release עם כל הקבצים.

### דרך 2: באמצעות GitHub Actions UI

1. עבור ל-Actions → Release
2. לחץ על "Run workflow"
3. הזן את מספר הגרסה (למשל: v1.0.0)
4. לחץ על "Run workflow"

## קבצים שנוצרים

### Windows
- **NSIS Installer** - קובץ התקנה מלא (מומלץ)
- **MSI Installer** - קובץ התקנה חלופי
- **Portable EXE** - גרסה ניידת ללא התקנה

### Android
- **ARM64 APK** - למכשירים מודרניים (64-bit)
- **ARMv7 APK** - למכשירים ישנים יותר (32-bit)
- **Universal APK** - עובד על כל המכשירים (גדול יותר)

## בדיקה לפני Release

הרץ את ה-build workflow כדי לוודא שהכל עובד:
```bash
git push origin main
```

ה-workflow יבנה את כל הפלטפורמות ויעלה artifacts לבדיקה.

## הכנה לאנדרואיד

**חשוב**: הפרויקט עדיין לא מוכן לבניית Android!

לפני שתוכל לבנות Android, עליך:
1. לעקוב אחר ההוראות ב-`ANDROID_SETUP.md`
2. להריץ `npm run tauri android init`
3. לשנות `if: false` ל-`if: true` ב-workflows (build.yml ו-release.yml)

## פתרון בעיות

### Android build נכשל
- ודא ש-Android support מאותחל: `npm run tauri android init`
- בדוק שיש NDK מותקן
- ודא שכל ה-targets של Rust מותקנים
- ראה `ANDROID_SETUP.md` למדריך מלא

### Windows build נכשל
- בדוק שיש Rust toolchain מותקן
- ודא שיש Visual Studio Build Tools

### החתימה לא עובדת
- הוסף secrets ב-GitHub:
  - `TAURI_SIGNING_PRIVATE_KEY`
  - `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`
