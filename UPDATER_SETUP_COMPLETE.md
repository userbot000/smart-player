# ✅ מערכת העדכונים מוכנה!

## 🎉 מה הושלם

- ✅ **Plugin מותקן**: `tauri-plugin-updater` + `tauri-plugin-process`
- ✅ **קומפוננטת UI**: `UpdaterDialog` בהגדרות
- ✅ **בדיקה אוטומטית**: בכל הפעלה של האפליקציה
- ✅ **הודעות**: Toast + התראות Windows
- ✅ **GitHub Actions**: workflow לבניית releases
- ✅ **Endpoint מוגדר**: https://github.com/userbot000/smart-player
- ⚠️ **חתימה דיגיטלית**: מושבתת זמנית (ראה למטה)

---

## ⚠️ חשוב - חתימה דיגיטלית

**כרגע החתימה הדיגיטלית מושבתת** כדי שתוכל לבדוק שהמערכת עובדת.

- ✅ **לפיתוח/בדיקה**: זה בסדר גמור
- ⚠️ **לייצור**: מומלץ להפעיל חתימה

**כשתהיה מוכן להפעיל חתימה**, ראה: **[UPDATER_SIGNING_KEYS.md](UPDATER_SIGNING_KEYS.md)**

---

## 🚀 השלבים הבאים

### 1. Commit והעלאה ל-GitHub

```bash
git add .
git commit -m "Add auto-updater system"
git push origin main
```

### 2. צור Release ראשון

```bash
# צור tag
git tag v0.1.0
git push origin v0.1.0
```

### 3. המתן לבנייה

1. עבור ל-**Actions** ב-GitHub: https://github.com/userbot000/smart-player/actions
2. תראה workflow "Release" רץ
3. המתן 10-15 דקות לסיום
4. בדוק ב-**Releases**: https://github.com/userbot000/smart-player/releases

### 4. וודא שהקבצים נוצרו

ב-Release צריכים להיות:
- ✅ `Smart-Player_0.1.0_x64-setup.nsis.zip`
- ✅ `Smart-Player_0.1.0_x64-setup.nsis.zip.sig`
- ✅ `latest.json` ⭐ **חשוב מאוד!**

---

## 🧪 בדיקה

### בדיקה מקומית (לפני release)

```bash
# בנה את האפליקציה
npm run tauri build

# בדוק שהקבצים נוצרו
dir src-tauri\target\release\bundle\nsis\
```

### בדיקת העדכון (אחרי release)

1. התקן את הגרסה מ-Release
2. פתח את האפליקציה
3. עבור להגדרות → "בדוק עדכונים"
4. צור גרסה חדשה (v0.1.1) ובדוק שהיא מזוהה

---

## 📝 יצירת גרסה חדשה (בעתיד)

```bash
# 1. עדכן גרסה בקבצים:
#    - src-tauri/tauri.conf.json: "version": "0.2.0"
#    - src-tauri/Cargo.toml: version = "0.2.0"

# 2. Commit
git add .
git commit -m "Release v0.2.0"
git push

# 3. צור Tag
git tag v0.2.0
git push origin v0.2.0

# 4. GitHub Actions יבנה אוטומטית!
```

---

## 🔍 איך לבדוק שזה עובד

### בדיקה 1: ה-endpoint זמין

```bash
curl https://github.com/userbot000/smart-player/releases/latest/download/latest.json
```

אם מקבל 404 → המתן שה-Release יושלם

### בדיקה 2: האפליקציה בודקת עדכונים

1. פתח את Developer Tools (F12)
2. פתח את האפליקציה
3. חפש בקונסול: "checking for updates" או שגיאות

### בדיקה 3: העדכון עובד

1. התקן גרסה ישנה (v0.1.0)
2. צור release חדש (v0.1.1)
3. פתח את האפליקציה הישנה
4. צריכה להופיע הודעה על עדכון זמין

---

## 🐛 פתרון בעיות נפוצות

### GitHub Actions נכשל

**שגיאה**: "failed to get updater configuration"
- ✅ **תוקן!** הוספנו את `plugins.updater` ל-`tauri.conf.json`

**שגיאה**: "targets is not valid"
- ✅ **תוקן!** הסרנו את `"updater"` מ-`targets`

### האפליקציה לא מזהה עדכונים

1. בדוק שה-endpoint נכון ב-`tauri.conf.json`
2. בדוק שה-Release הוא **public**
3. בדוק שקובץ `latest.json` קיים
4. נסה לגשת ל-URL ידנית בדפדפן

### שגיאת חתימה דיגיטלית

אם מקבל "Invalid signature":
1. אל תערוך ידנית את `latest.json`
2. תן ל-GitHub Actions לבנות הכל
3. אל תשנה את קבצי ה-`.sig`

---

## 📚 מסמכים נוספים

- **[UPDATER_QUICK_START.md](UPDATER_QUICK_START.md)** - מדריך התחלה מהירה
- **[UPDATER_GUIDE.md](UPDATER_GUIDE.md)** - מדריך מפורט ומלא
- **[Tauri Updater Docs](https://v2.tauri.app/plugin/updater/)** - תיעוד רשמי

---

## 🎯 סיכום

**מה יקרה עכשיו:**

1. תעשה `git tag v0.1.0` ו-`push`
2. GitHub Actions יבנה את האפליקציה (10-15 דקות)
3. Release ייווצר אוטומטית עם כל הקבצים
4. מעכשיו, כל פעם שתיצור tag חדש, המערכת תעבוד אוטומטית!

**למשתמשים:**
- האפליקציה תבדוק עדכונים אוטומטית בכל הפעלה
- אם יש עדכון, תקפוץ הודעה
- התקנה בלחיצת כפתור מההגדרות

---

## ✨ זהו! המערכת מוכנה לשימוש

יש לך שאלות? בדוק את המדריכים או פתח issue ב-GitHub.

**בהצלחה!** 🚀
