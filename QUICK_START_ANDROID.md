# 🚀 מדריך מהיר - בניית Android ב-GitHub Actions

## 📱 בניית APK ללא התקנה מקומית

אין צורך להתקין Android Studio, NDK, או כלים נוספים! GitHub Actions יעשה הכל בשבילך.

### שלב 1: הרץ את ה-Workflow

1. עבור לטאב **Actions** בריפו ב-GitHub
2. בחר את ה-workflow **"Initialize and Build Android"**
3. לחץ על **"Run workflow"**
4. (אופציונלי) שנה את:
   - **App Name**: שם האפליקציה (ברירת מחדל: Smart Player)
   - **App Identifier**: מזהה האפליקציה (ברירת מחדל: com.smartplayer.app)
5. לחץ על הכפתור הירוק **"Run workflow"**

### שלב 2: המתן לסיום

ה-workflow ייקח בערך 15-30 דקות:
- ✅ יאתחל את Android (בפעם הראשונה בלבד)
- ✅ יבנה APK לכל הארכיטקטורות
- ✅ יעלה את הקבצים כ-Artifacts
- ✅ יעשה commit לשינויים (בפעם הראשונה)

### שלב 3: הורד את הקבצים

1. לחץ על ה-workflow run שהסתיים
2. גלול למטה ל-**Artifacts**
3. הורד:
   - **APK** - את ה-APK שאתה צריך:
     - **smart-player-android-arm64** - למכשירים מודרניים (מומלץ)
     - **smart-player-android-armv7** - למכשירים ישנים
     - **smart-player-android-universal** - עובד על כולם (גדול יותר)
   - **android-initialization-files** (בפעם הראשונה בלבד) - קבצי האתחול

### שלב 4: התקן על המכשיר

1. העבר את קובץ ה-APK למכשיר Android
2. פתח את הקובץ
3. אשר התקנה מ-"מקורות לא ידועים" (אם נדרש)
4. התקן והנה! 🎉

### שלב 5 (אופציונלי): שמור את האתחול

אם זו הפעם הראשונה ואתה רוצה לשמור את האתחול:

1. הורד את **android-initialization-files.tar.gz**
2. חלץ בשורש הפרויקט:
   ```bash
   tar -xzf android-init-files.tar.gz
   ```
3. עשה commit:
   ```bash
   git add src-tauri/gen/android src-tauri/tauri.conf.json
   git commit -m "Initialize Android support"
   git push
   ```

**או** פשוט דלג על זה - ה-workflow יאתחל מחדש בכל פעם (לוקח רק דקה נוספת).

## 🔄 בניות עתידיות

### אם Android כבר מאותחל (שמרת את הקבצים):
- פשוט הרץ את ה-workflow שוב
- זה יבנה APK חדש עם השינויים האחרונים
- לא צריך לאתחל שוב

### אם לא שמרת את האתחול:
- ה-workflow יאתחל מחדש אוטומטית
- לוקח דקה נוספת, אבל עובד מצוין

### הפעלת בניות אוטומטיות:
לאחר האתחול הראשון, תוכל להפעיל בניות אוטומטיות:

1. ערוך `.github/workflows/build.yml`
2. מצא את השורה: `if: false  # Set to true after running 'npm run tauri android init'`
3. שנה ל: `if: true`
4. עשה commit

עכשיו כל push ל-main יבנה גם Android אוטומטית!

## 📦 יצירת Release עם Android

לאחר שAndroid מאותחל:

1. ערוך `.github/workflows/release.yml`
2. שנה `if: false` ל-`if: true` בחלק ה-Android
3. צור tag:
   ```bash
   git tag v1.0.0
   git push origin --tags
   ```
4. ה-release ייווצר אוטומטית עם Windows + Android!

## ❓ שאלות נפוצות

### האם צריך להריץ את זה כל פעם?
לא! רק בפעם הראשונה. אחר כך ה-workflow יבנה APK ישירות.

### איך אני יודע שזה הצליח?
- ✅ סימן ירוק ליד ה-workflow run
- 📦 Artifacts זמינים להורדה
- 📝 Summary מפורט בסוף

### מה אם זה נכשל?
- בדוק את הלוגים של ה-workflow
- פתח Issue עם הלוג
- נסה להריץ שוב (לפעמים זה עוזר)

### האם זה בטוח?
כן! הכל רץ ב-GitHub Actions, סביבה מבודדת ובטוחה.

### כמה זה עולה?
חינם! GitHub Actions נותן 2000 דקות חינם לחודש לריפו פרטי, ובלתי מוגבל לריפו ציבורי.

## 🎯 סיכום

```
1. Actions → Initialize and Build Android → Run workflow
2. המתן 15-30 דקות
3. הורד APK מ-Artifacts
4. התקן על המכשיר
5. תהנה! 🎵
```

זהו! פשוט כמו שזה נשמע. 😊

---

**טיפ**: שמור את ה-APK במקום בטוח. אם תרצה לעדכן, פשוט הרץ את ה-workflow שוב!
