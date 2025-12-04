# 📦 התקנה אופליין - Smart Player

מדריך להתקנת Smart Player במחשבים ללא חיבור לאינטרנט.

## 📋 מה צריך להכין

### 1. Smart Player Installer
הורד מ-[Releases](../../releases/latest):
- `Smart-Player-vX.X.X-Windows-Installer.exe` (NSIS)

### 2. WebView2 Runtime (אם חסר)
הורד מ: https://developer.microsoft.com/en-us/microsoft-edge/webview2/

בחר אחד מהבאים:

#### אופציה A: Standalone Installer (מומלץ לאופליין)
- **קובץ**: `MicrosoftEdgeWebView2RuntimeInstallerX64.exe`
- **גודל**: ~150MB
- **יתרון**: עובד לחלוטין אופליין
- **קישור ישיר**: https://go.microsoft.com/fwlink/p/?LinkId=2124703

#### אופציה B: Fixed Version Runtime
- **גודל**: ~150MB
- **יתרון**: גרסה קבועה, לא מתעדכנת אוטומטית
- **שימוש**: למערכות סגורות/ארגוניות

## 🔧 תהליך ההתקנה

### שלב 1: בדוק אם WebView2 כבר מותקן

במחשב היעד, הרץ ב-PowerShell:
```powershell
Get-AppxPackage -Name "Microsoft.WebView2"
```

**אם מחזיר תוצאה** → WebView2 מותקן, דלג לשלב 3

**אם לא מחזיר כלום** → המשך לשלב 2

### שלב 2: התקן WebView2

1. העבר את `MicrosoftEdgeWebView2RuntimeInstallerX64.exe` למחשב היעד
2. הרץ את הקובץ
3. עקוב אחר ההוראות
4. המתן לסיום ההתקנה

### שלב 3: התקן Smart Player

1. העבר את `Smart-Player-vX.X.X-Windows-Installer.exe` למחשב היעד
2. הרץ את הקובץ
3. עקוב אחר ההוראות
4. המתן לסיום ההתקנה

### שלב 4: הפעל את Smart Player

1. פתח את Smart Player מתפריט Start
2. או לחץ פעמיים על קובץ מוזיקה (אם הגדרת file associations)

## 📦 הכנת חבילת התקנה

אם אתה צריך להתקין על מספר מחשבים:

### צור תיקייה עם הקבצים הבאים:

```
SmartPlayer-Offline-Install/
├── 1-WebView2-Installer.exe
├── 2-SmartPlayer-Installer.exe
└── README.txt
```

### תוכן README.txt:
```
התקנת Smart Player - אופליין

1. הרץ: 1-WebView2-Installer.exe
   המתן לסיום ההתקנה

2. הרץ: 2-SmartPlayer-Installer.exe
   המתן לסיום ההתקנה

3. פתח את Smart Player מתפריט Start

זהו! תהנה מהמוזיקה 🎵
```

## 🔍 בדיקת התקנה

### בדוק שהכל עובד:

1. **WebView2 מותקן**:
   ```powershell
   Get-AppxPackage -Name "Microsoft.WebView2"
   ```

2. **Smart Player מותקן**:
   ```powershell
   Get-ItemProperty HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\* | 
   Where-Object {$_.DisplayName -like "*Smart Player*"}
   ```

3. **Smart Player נפתח**:
   - פתח מתפריט Start
   - אמור להיפתח ללא שגיאות

## ❓ פתרון בעיות

### WebView2 לא מתקין

**שגיאה**: "Installation failed"

**פתרון**:
1. ודא שאתה מנהל (Run as Administrator)
2. ודא Windows 7 SP1 ומעלה
3. נסה את Fixed Version Runtime במקום Standalone

### Smart Player לא נפתח

**שגיאה**: מסך שחור או כלום

**פתרון**:
1. ודא ש-WebView2 מותקן (ראה בדיקה למעלה)
2. הפעל מחדש את המחשב
3. נסה להתקין מחדש

### "Access Denied"

**פתרון**:
1. לחץ ימני על ההתקנה
2. "Run as administrator"
3. אשר את ההתקנה

## 💾 גיבוי והעברה

### גיבוי הגדרות (אופציונלי)

הגדרות נשמרות ב:
```
%APPDATA%\com.user.smart-player\
```

העבר תיקייה זו למחשב חדש כדי לשמור:
- רשימות השמעה
- מועדפים
- הגדרות
- היסטוריה

### העברת ספרייה

1. העבר את תיקיות המוזיקה
2. פתח Smart Player
3. הוסף את התיקיות מחדש (Settings → Watched Folders)

## 📊 דרישות מערכת

### מינימום:
- **OS**: Windows 7 SP1 / Windows Server 2008 R2 SP1
- **RAM**: 2GB
- **Disk**: 500MB פנויים
- **WebView2**: נדרש (כלול בהתקנה)

### מומלץ:
- **OS**: Windows 10/11
- **RAM**: 4GB+
- **Disk**: 1GB+ פנויים
- **CPU**: Dual-core 2GHz+

## 🏢 התקנה ארגונית

### Group Policy Deployment

1. הורד Fixed Version Runtime
2. פרוס דרך GPO:
   ```
   msiexec /i MicrosoftEdgeWebView2RuntimeInstallerX64.msi /quiet
   ```

3. פרוס Smart Player:
   ```
   Smart-Player-Installer.exe /S
   ```

### SCCM/Intune

1. צור package עם שני הקבצים
2. הגדר dependency: WebView2 → Smart Player
3. פרוס למחשבים

## 📞 תמיכה

בעיות? ראה [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

---

**עדכון אחרון**: ${new Date().toLocaleDateString('he-IL')}
