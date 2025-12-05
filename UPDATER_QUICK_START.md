# 🚀 התחלה מהירה - מערכת עדכונים

## ✅ מה כבר עשינו

הוספנו מערכת עדכונים מלאה לתוכנה:
- ✅ Plugin של Tauri Updater
- ✅ קומפוננטת עדכונים בהגדרות
- ✅ בדיקה אוטומטית בהפעלה
- ✅ הודעות Toast + התראות מערכת
- ✅ GitHub Actions workflow

## 🎯 מה צריך לעשות עכשיו

### 1️⃣ הגדר את ה-Repository ב-GitHub

אם עדיין לא עשית:
```bash
git remote add origin https://github.com/YOUR_USERNAME/smart-player.git
git push -u origin main
```

### 2️⃣ ה-Updater Endpoint כבר מוגדר! ✅

הקובץ `src-tauri/tauri.conf.json` כבר מוגדר עם:

```json
{
  "plugins": {
    "updater": {
      "endpoints": [
        "https://github.com/userbot000/smart-player/releases/latest/download/latest.json"
      ],
      "pubkey": ""
    }
  }
}
```

### 3️⃣ צור Release ראשון

```bash
# עדכן את הגרסה ב-tauri.conf.json ל-0.1.0
# עדכן את הגרסה ב-Cargo.toml ל-0.1.0

# Commit
git add .
git commit -m "Release v0.1.0"
git push

# צור Tag
git tag v0.1.0
git push origin v0.1.0
```

### 4️⃣ המתן לבנייה

1. עבור ל-**Actions** ב-GitHub
2. תראה workflow "Release" רץ
3. המתן 10-15 דקות
4. בדוק ב-**Releases** שהקבצים נוצרו

### 5️⃣ בדוק שזה עובד

1. הורד והתקן את הגרסה מ-Releases
2. פתח את האפליקציה
3. צור גרסה חדשה (v0.1.1)
4. בדוק שהאפליקציה מזהה את העדכון

## 📝 יצירת גרסה חדשה

כל פעם שאתה רוצה לשחרר עדכון:

```bash
# 1. עדכן גרסה
# src-tauri/tauri.conf.json: "version": "0.2.0"
# src-tauri/Cargo.toml: version = "0.2.0"

# 2. Commit
git add .
git commit -m "Release v0.2.0"
git push

# 3. צור Tag
git tag v0.2.0
git push origin v0.2.0

# 4. GitHub Actions יבנה אוטומטית!
```

## 🎮 שימוש במערכת העדכונים

### למשתמשים

1. **בדיקה אוטומטית** - האפליקציה בודקת עדכונים בכל הפעלה
2. **הודעה** - אם יש עדכון, תקפוץ הודעה
3. **התקנה** - עבור להגדרות ולחץ "בדוק עדכונים" → "הורד והתקן"

### למפתחים

```typescript
// בדיקה ידנית
import { check } from '@tauri-apps/plugin-updater';

const update = await check();
if (update) {
  console.log(`Update available: ${update.version}`);
  await update.downloadAndInstall();
}
```

## 🔧 פתרון בעיות מהירות

### האפליקציה לא מזהה עדכונים

```bash
# בדוק שה-endpoint נכון
curl https://github.com/userbot000/smart-player/releases/latest/download/latest.json
```

אם מקבל 404:
- ודא שה-Release הוא **public**
- בדוק שקובץ `latest.json` קיים ב-Release
- המתן כמה דקות אחרי יצירת ה-Release

### GitHub Actions נכשל

1. עבור ל-Actions ובדוק את הלוגים
2. ודא שכל התלויות מותקנות
3. בדוק שמספרי הגרסאות תואמים בכל הקבצים

## 📚 מסמכים נוספים

- **[UPDATER_GUIDE.md](UPDATER_GUIDE.md)** - מדריך מפורט ומלא
- **[Tauri Updater Docs](https://v2.tauri.app/plugin/updater/)** - תיעוד רשמי

## ✨ זהו!

עכשיו יש לך מערכת עדכונים מלאה שעובדת אוטומטית! 🎉

כל מה שצריך זה:
1. לעדכן את מספר הגרסה
2. לעשות `git tag` ו-`push`
3. GitHub Actions יעשה את השאר!
