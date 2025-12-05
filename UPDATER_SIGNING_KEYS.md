# 🔐 מדריך מפתחות חתימה דיגיטלית

## 📋 למה צריך חתימה דיגיטלית?

חתימה דיגיטלית מוודאת ש:
- ✅ העדכון מגיע ממך (לא מהאקר)
- ✅ הקובץ לא שונה בדרך
- ✅ המשתמשים מוגנים מעדכונים מזויפים

---

## ⚠️ מצב נוכחי

**כרגע החתימה מושבתת** - זה בסדר לפיתוח ובדיקה, אבל לא מומלץ לייצור.

---

## 🔧 איך להפעיל חתימה דיגיטלית

### שלב 1: התקן Tauri CLI (אם עדיין לא)

```bash
npm install -g @tauri-apps/cli
```

### שלב 2: צור מפתחות חתימה

```bash
# הרץ את הפקודה הזו
tauri signer generate -w ~/.tauri/myapp.key
```

**תתבקש להזין סיסמה** - זכור אותה! תצטרך אותה בהמשך.

הפקודה תיצור:
- **Private Key** (מפתח פרטי) - שמור בסוד!
- **Public Key** (מפתח ציבורי) - להוסיף לאפליקציה

### שלב 3: קבל את המפתח הציבורי

```bash
tauri signer sign -k ~/.tauri/myapp.key --password YOUR_PASSWORD
```

תקבל משהו כמו:
```
Public key: dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHB1YmxpYyBrZXk6IEFCQ0RFRjEyMzQ1Njc4OTAK...
```

### שלב 4: הוסף את המפתח הציבורי ל-tauri.conf.json

```json
{
  "plugins": {
    "updater": {
      "endpoints": [...],
      "pubkey": "dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHB1YmxpYyBrZXk6IEFCQ0RFRjEyMzQ1Njc4OTAK..."
    }
  }
}
```

### שלב 5: הוסף Secrets ל-GitHub

1. עבור ל-GitHub Repository
2. **Settings** → **Secrets and variables** → **Actions**
3. לחץ **New repository secret**

**Secret 1:**
- Name: `TAURI_SIGNING_PRIVATE_KEY`
- Value: תוכן הקובץ `~/.tauri/myapp.key` (פתח בעורך טקסט והעתק הכל)

**Secret 2:**
- Name: `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`
- Value: הסיסמה שהזנת בשלב 2

### שלב 6: עדכן את GitHub Actions

ערוך `.github/workflows/release.yml`:

```yaml
- name: Build Tauri app
  uses: tauri-apps/tauri-action@v0
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    TAURI_SIGNING_PRIVATE_KEY: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY }}
    TAURI_SIGNING_PRIVATE_KEY_PASSWORD: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY_PASSWORD }}
  with:
    ...
```

### שלב 7: Commit ו-Push

```bash
git add src-tauri/tauri.conf.json .github/workflows/release.yml
git commit -m "Enable code signing for updater"
git push
```

---

## 🧪 בדיקה

צור tag חדש ובדוק שהבנייה עוברת:

```bash
git tag v0.1.1
git push origin v0.1.1
```

עבור ל-Actions ובדוק שאין שגיאות של "incorrect updater private key password".

---

## 🔒 אבטחה - חשוב!

### ✅ מה לעשות:
- שמור את המפתח הפרטי במקום בטוח
- אל תשתף את המפתח הפרטי עם אף אחד
- השתמש בסיסמה חזקה
- גבה את המפתח (אם תאבד אותו, לא תוכל לעדכן את האפליקציה!)

### ❌ מה לא לעשות:
- אל תעלה את המפתח הפרטי ל-Git
- אל תשתף את הסיסמה
- אל תשתמש באותו מפתח לפרויקטים שונים

---

## 🆘 פתרון בעיות

### "incorrect updater private key password"

**בעיה**: הסיסמה ב-GitHub Secrets לא נכונה

**פתרון**:
1. בדוק שהסיסמה נכונה
2. עדכן את ה-Secret ב-GitHub
3. נסה שוב

### "Missing comment in secret key"

**בעיה**: המפתח הפרטי לא תקין

**פתרון**:
1. צור מפתחות חדשים עם `tauri signer generate`
2. העתק את **כל** תוכן הקובץ (כולל השורה הראשונה)
3. עדכן את ה-Secret ב-GitHub

### "failed to decode secret key"

**בעיה**: המפתח לא הועתק נכון

**פתרון**:
1. פתח את `~/.tauri/myapp.key` בעורך טקסט
2. העתק **הכל** (Ctrl+A, Ctrl+C)
3. הדבק ב-GitHub Secret
4. ודא שאין רווחים או שורות ריקות בהתחלה/סוף

---

## 📝 סיכום

**ללא חתימה (מצב נוכחי):**
- ✅ עובד לפיתוח ובדיקה
- ⚠️ פחות בטוח
- ⚠️ Windows Defender עשוי לחסום

**עם חתימה:**
- ✅ מאובטח לחלוטין
- ✅ מונע עדכונים מזויפים
- ✅ מומלץ לייצור

---

## 🎯 מתי להפעיל חתימה?

- **עכשיו**: אם אתה מתכנן לשחרר לציבור
- **מאוחר יותר**: אם אתה רק בודק את המערכת

החתימה לא חובה לפיתוח, אבל **מומלצת מאוד לייצור**.

---

## 📚 קישורים

- [Tauri Updater - Code Signing](https://v2.tauri.app/plugin/updater/#code-signing)
- [Tauri Signer CLI](https://v2.tauri.app/reference/cli/#signer)

---

**זהו!** כשתהיה מוכן, פשוט עקוב אחרי השלבים למעלה 🔐
