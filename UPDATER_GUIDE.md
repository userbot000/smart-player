# 🔄 מדריך מערכת עדכונים

מדריך מלא להגדרת ושימוש במערכת העדכונים האוטומטית של Smart Player.

## 📋 תוכן עניינים

1. [איך זה עובד](#איך-זה-עובד)
2. [הגדרת GitHub Releases](#הגדרת-github-releases)
3. [יצירת Release ראשון](#יצירת-release-ראשון)
4. [עדכון גרסה](#עדכון-גרסה)
5. [בדיקת עדכונים](#בדיקת-עדכונים)
6. [פתרון בעיות](#פתרון-בעיות)

---

## 🔍 איך זה עובד

מערכת העדכונים של Tauri עובדת עם GitHub Releases:

1. **בניית Release** - GitHub Actions בונה את האפליקציה ויוצר קבצי התקנה
2. **יצירת Updater Artifacts** - Tauri יוצר קבצי `.sig` ו-JSON עם מידע על העדכון
3. **בדיקה אוטומטית** - האפליקציה בודקת עדכונים בהפעלה
4. **הורדה והתקנה** - המשתמש יכול להוריד ולהתקין ישירות מההגדרות

### מבנה הקבצים ב-Release

כל release מכיל:
- `Smart-Player_X.X.X_x64-setup.nsis.zip` - התקנה מלאה (NSIS)
- `Smart-Player_X.X.X_x64-setup.nsis.zip.sig` - חתימה דיגיטלית
- `latest.json` - מידע על הגרסה העדכנית

---

## ⚙️ הגדרת GitHub Releases

### 1. הגדרת Repository

ודא שה-repository שלך ב-GitHub הוא **public** או שיש לך GitHub Pro (private repos עם Actions).

### 2. הגדרת tauri.conf.json

הקובץ כבר מוגדר עם:

```json
{
  "bundle": {
    "active": true,
    "targets": ["nsis"],
    "createUpdaterArtifacts": true
  }
}
```

### 3. הגדרת Endpoint (אופציונלי)

אם אתה רוצה לשנות את ה-endpoint לבדיקת עדכונים, הוסף ל-`tauri.conf.json`:

```json
{
  "plugins": {
    "updater": {
      "endpoints": [
        "https://github.com/YOUR_USERNAME/YOUR_REPO/releases/latest/download/latest.json"
      ]
    }
  }
}
```

**החלף**:
- `YOUR_USERNAME` - שם המשתמש שלך ב-GitHub
- `YOUR_REPO` - שם ה-repository

---

## 🚀 יצירת Release ראשון

### שלב 1: עדכן את מספר הגרסה

ערוך את `src-tauri/tauri.conf.json`:

```json
{
  "version": "0.1.0"
}
```

וגם את `src-tauri/Cargo.toml`:

```toml
[package]
version = "0.1.0"
```

### שלב 2: צור Tag

```bash
git tag v0.1.0
git push origin v0.1.0
```

### שלב 3: GitHub Actions יבנה אוטומטית

1. עבור ל-**Actions** ב-GitHub
2. תראה workflow בשם "Release" רץ
3. המתן 10-15 דקות לסיום הבנייה
4. ה-Release ייווצר אוטומטית ב-**Releases**

### שלב 4: בדוק את ה-Release

עבור ל-**Releases** ב-GitHub ותראה:
- קבצי התקנה (`.nsis.zip`)
- קבצי חתימה (`.sig`)
- `latest.json` - **חשוב מאוד!**

---

## 📦 עדכון גרסה

כשאתה רוצה לשחרר גרסה חדשה:

### 1. עדכן מספר גרסה

**src-tauri/tauri.conf.json**:
```json
{
  "version": "0.2.0"
}
```

**src-tauri/Cargo.toml**:
```toml
[package]
version = "0.2.0"
```

**package.json** (אופציונלי):
```json
{
  "version": "0.2.0"
}
```

### 2. עדכן CHANGELOG

ערוך את `CHANGELOG.md` והוסף את השינויים:

```markdown
## [0.2.0] - 2024-12-05

### Added
- תכונה חדשה 1
- תכונה חדשה 2

### Fixed
- תיקון באג 1
- תיקון באג 2
```

### 3. Commit ו-Push

```bash
git add .
git commit -m "Release v0.2.0"
git push
```

### 4. צור Tag חדש

```bash
git tag v0.2.0
git push origin v0.2.0
```

### 5. המתן לבנייה

GitHub Actions יבנה אוטומטית את הגרסה החדשה.

---

## 🔔 בדיקת עדכונים

### בדיקה אוטומטית

האפליקציה בודקת עדכונים אוטומטית:
- **בהפעלה** - כל פעם שהאפליקציה נפתחת
- **הודעת Toast** - אם יש עדכון זמין
- **התראה מערכת** - notification של Windows

### בדיקה ידנית

1. פתח את האפליקציה
2. עבור ל-**הגדרות**
3. לחץ על **"בדוק עדכונים"**
4. אם יש עדכון:
   - תראה את מספר הגרסה החדשה
   - רשימת שינויים
   - כפתור **"הורד והתקן"**

### תהליך ההתקנה

1. לחץ **"הורד והתקן"**
2. האפליקציה תוריד את העדכון (עם progress bar)
3. לאחר ההורדה, האפליקציה תיסגר ותיפתח מחדש עם הגרסה החדשה

---

## 🧪 בדיקה לפני שחרור

### בדיקה מקומית

לפני שאתה יוצר release, בדוק שהכל עובד:

```bash
# בנה את האפליקציה
npm run tauri build

# בדוק שהקבצים נוצרו
ls src-tauri/target/release/bundle/nsis/
```

### בדיקת Updater

1. צור release ראשון (v0.1.0)
2. התקן את האפליקציה
3. צור release שני (v0.2.0)
4. פתח את האפליקציה הישנה
5. בדוק שהיא מזהה את העדכון

---

## 🐛 פתרון בעיות

### האפליקציה לא מזהה עדכונים

**בדוק**:
1. ה-`latest.json` קיים ב-Release
2. ה-endpoint נכון ב-`tauri.conf.json`
3. ה-repository הוא public
4. יש חיבור לאינטרנט

**פתרון**:
```bash
# בדוק את ה-endpoint
curl https://github.com/YOUR_USERNAME/YOUR_REPO/releases/latest/download/latest.json
```

### שגיאת חתימה דיגיטלית

**בעיה**: "Invalid signature"

**פתרון**:
1. ודא שקבצי `.sig` קיימים ב-Release
2. אל תערוך ידנית את `latest.json`
3. תן ל-GitHub Actions לבנות הכל

### העדכון לא מתקין

**בעיה**: ההורדה מצליחה אבל ההתקנה נכשלת

**פתרון**:
1. הרץ את האפליקציה כ-Administrator
2. בדוק שאין antivirus חוסם
3. בדוק שיש מספיק מקום בדיסק

### GitHub Actions נכשל

**בעיה**: הבנייה נכשלת ב-Actions

**פתרון**:
1. בדוק את הלוגים ב-Actions
2. ודא שכל התלויות מותקנות
3. בדוק שמספרי הגרסאות תואמים

---

## 📝 טיפים

### 1. גרסאות Semantic

השתמש ב-[Semantic Versioning](https://semver.org/):
- `MAJOR.MINOR.PATCH`
- `1.0.0` - גרסה ראשונה יציבה
- `1.1.0` - תכונה חדשה
- `1.1.1` - תיקון באג

### 2. Pre-releases

לגרסאות בטא:
```bash
git tag v0.2.0-beta.1
```

ב-GitHub Actions, שנה:
```yaml
prerelease: true
```

### 3. Release Notes

כתוב release notes טובים:
- **Added** - תכונות חדשות
- **Changed** - שינויים בתכונות קיימות
- **Fixed** - תיקוני באגים
- **Removed** - תכונות שהוסרו

### 4. בדיקות אוטומטיות

הוסף tests לפני release:
```yaml
- name: Run tests
  run: npm test
```

---

## 🔐 אבטחה

### חתימה דיגיטלית

Tauri חותם אוטומטית את העדכונים:
- מונע התקנת עדכונים מזויפים
- מוודא שהעדכון מגיע מהמקור הנכון

### HTTPS

כל ההורדות דרך HTTPS:
- GitHub משתמש ב-HTTPS
- אין אפשרות ל-man-in-the-middle attacks

---

## 📚 קישורים שימושיים

- [Tauri Updater Docs](https://v2.tauri.app/plugin/updater/)
- [GitHub Actions for Tauri](https://github.com/tauri-apps/tauri-action)
- [Semantic Versioning](https://semver.org/)

---

## ✅ Checklist לפני Release

- [ ] עדכנתי את מספר הגרסה בכל הקבצים
- [ ] עדכנתי את CHANGELOG.md
- [ ] בדקתי שהאפליקציה עובדת מקומית
- [ ] יצרתי tag ו-push לגיטהאב
- [ ] GitHub Actions רץ בהצלחה
- [ ] בדקתי שה-Release נוצר עם כל הקבצים
- [ ] בדקתי שהעדכון עובד מגרסה קודמת

---

**זהו!** עכשיו יש לך מערכת עדכונים מלאה ואוטומטית 🎉
