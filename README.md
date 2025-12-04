# 🎵 Smart Player

נגן מוזיקה חכם ומתקדם עם ממשק בעברית, תמיכה בהורדות מיוטיוב, וניהול ספרייה מתקדם.

[![Windows Build](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/build.yml/badge.svg)](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/build.yml)
[![Android Init](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/android-init.yml/badge.svg)](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/android-init.yml)

![Windows](https://img.shields.io/badge/Windows-0078D6?style=flat&logo=windows&logoColor=white)
![Android](https://img.shields.io/badge/Android-3DDC84?style=flat&logo=android&logoColor=white)
![Tauri](https://img.shields.io/badge/Tauri-FFC131?style=flat&logo=tauri&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=flat&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)

## ✨ תכונות

### 🎵 נגן מוזיקה
- נגן אודיו מתקדם עם תמיכה בפורמטים רבים (MP3, FLAC, WAV, OGG, M4A, AAC)
- בקרות מלאות: play/pause, next/prev, shuffle, repeat
- **מהירות השמעה** - 0.5x עד 2x
- תור חכם שלומד את ההעדפות שלך
- סימניות בשירים
- שליטה בעוצמת קול

### 📚 ניהול ספרייה
- סריקת תיקיות אוטומטית
- תמיכה בתתי-תיקיות היררכיות
- תצוגת תיקיות עם ניווט קל
- חיפוש מתקדם (שירים, אמנים, אלבומים, תיקיות)
- מועדפים והיסטוריה
- רשימות השמעה מותאמות אישית

### 🎨 ממשק משתמש
- ממשק בעברית מלא (RTL)
- ערכות נושא (בהיר/כהה/אוטומטי)
- צבעי הדגשה מותאמים אישית
- עיצוב מודרני ונקי
- תמיכה מלאה ב-RTL

### 🛠️ כלים
- **יצירת רינגטונים** - חתוך שירים ליצירת רינגטונים
- **עריכת מטאדאטה** - ערוך תגיות ID3 ותמונות אלבום
- הורדות מיוטיוב (בפיתוח)

### 📱 פלטפורמות
- ✅ **Windows** - מוכן לחלוטין
- 🔄 **Android** - דורש אתחול (ראה `ANDROID_SETUP.md`)

## 📥 התקנה

### Windows
הורד את קובץ ההתקנה מ-[Releases](../../releases/latest):
- **NSIS Installer** (מומלץ) - התקנה מלאה עם file associations
- **Portable EXE** - גרסה ניידת ללא התקנה

### Android

**אופציה 1: בניה אוטומטית ב-GitHub (מומלץ)**
1. עבור ל-Actions → "Initialize and Build Android"
2. לחץ "Run workflow"
3. המתן 15-30 דקות
4. הורד את ה-APK מ-Artifacts

📖 **מדריך מפורט**: ראה [QUICK_START_ANDROID.md](QUICK_START_ANDROID.md)

**אופציה 2: בניה מקומית**
1. עקוב אחר ההוראות ב-`ANDROID_SETUP.md`
2. בנה APK מקומית

## 🚀 פיתוח

### דרישות מקדימות
- Node.js 20+
- Rust (latest stable)
- npm או yarn

### התקנה
```bash
# התקן תלויות
npm install

# הרץ במצב פיתוח
npm run tauri dev

# בנה לייצור
npm run tauri build
```

### Android Development
ראה `ANDROID_SETUP.md` למדריך מלא.

## 📖 תיעוד

- **[QUICK_START_ANDROID.md](QUICK_START_ANDROID.md)** - 🚀 בניית Android ב-GitHub (מומלץ!)
- **[CHECKLIST.md](CHECKLIST.md)** - מצב מוכנות הפרויקט
- **[ANDROID_SETUP.md](ANDROID_SETUP.md)** - הכנה מקומית לאנדרואיד
- **[.github/RELEASE.md](.github/RELEASE.md)** - מדריך יצירת releases

## 🏗️ טכנולוגיות

### Frontend
- **React 18** - ספריית UI
- **TypeScript** - שפת תכנות
- **Vite** - build tool
- **Fluent UI** - ספריית קומפוננטות
- **Zustand** - ניהול state
- **Howler.js** - נגן אודיו

### Backend
- **Tauri 2** - framework לאפליקציות desktop/mobile
- **Rust** - שפת backend
- **IndexedDB** - מסד נתונים מקומי

### Plugins
- tauri-plugin-fs - גישה למערכת קבצים
- tauri-plugin-dialog - דיאלוגים מקוריים
- tauri-plugin-shell - הרצת פקודות
- tauri-plugin-http - בקשות HTTP
- tauri-plugin-notification - התראות

## 🤝 תרומה

תרומות מתקבלות בברכה! אנא:
1. צור Fork של הפרויקט
2. צור branch לתכונה שלך
3. Commit את השינויים
4. Push ל-branch
5. פתח Pull Request

## 📝 רישיון

הפרויקט הזה הוא קוד פתוח.

## 🙏 תודות

- [Tauri](https://tauri.app/) - framework מדהים
- [Fluent UI](https://react.fluentui.dev/) - ספריית UI יפה
- [Howler.js](https://howlerjs.com/) - נגן אודיו מעולה
- כל התורמים והמשתמשים!

---

**הערה**: הפרויקט בפיתוח פעיל. תכונות חדשות מתווספות באופן קבוע.

## 📞 יצירת קשר

יש שאלות או הצעות? פתח [Issue](../../issues/new)!

---

Made with ❤️ in Israel
