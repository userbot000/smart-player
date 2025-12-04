# מבנה תיקיית Bin

## מיקום
התיקייה נמצאת ב: `%LOCALAPPDATA%\com.smart-player.app\bin\`

דוגמה: `C:\Users\YourName\AppData\Local\com.smart-player.app\bin\`

## קבצים
- **yt-dlp.exe** - כלי להורדת וידאו/אודיו מיוטיוב
- **ffmpeg.exe** - כלי להמרת פורמטים ועיבוד אודיו

## התקנה אוטומטית
כאשר לוחצים על כפתור "עדכן" בממשק ההורדות:
1. האפליקציה יוצרת את תיקיית `bin` אם היא לא קיימת
2. מורידה את `yt-dlp.exe` מ-GitHub
3. מורידה את `ffmpeg.exe` מ-gyan.dev

## בדיקה ידנית
אפשר לבדוק אם הקבצים קיימים:
```powershell
Test-Path "$env:LOCALAPPDATA\com.smart-player.app\bin\yt-dlp.exe"
Test-Path "$env:LOCALAPPDATA\com.smart-player.app\bin\ffmpeg.exe"
```

## התקנה ידנית
אם ההתקנה האוטומטית נכשלת:

### yt-dlp
1. הורד מ: https://github.com/yt-dlp/yt-dlp/releases/latest
2. שמור את `yt-dlp.exe` בתיקייה: `%LOCALAPPDATA%\com.smart-player.app\bin\`

### ffmpeg
1. הורד מ: https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip
2. חלץ את `ffmpeg.exe` מתוך `bin\` בתוך הזיפ
3. שמור ב: `%LOCALAPPDATA%\com.smart-player.app\bin\`

## יתרונות הגישה החדשה
- ✅ נתיבים קבועים וברורים
- ✅ לא תלוי ב-PATH של המערכת
- ✅ קל לאיתור בעיות
- ✅ התקנה מבודדת לאפליקציה
- ✅ לא משפיע על כלים אחרים במערכת
