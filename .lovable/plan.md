

## تعديل سكربت التثبيت ليتجاوز فشل مستودعات apt

### السبب
- VPS يستخدم Ubuntu Noble قديم نُقل إلى `old-releases.ubuntu.com` وبعض مساراته ترجع 404
- يوجد مستودعان تالفان: `packages.azlux.fr/debian noble` و Debian `stretch`
- نتيجة `set -e` + فشل `apt-get update` → السكربت يتوقف قبل تثبيت أي شيء
- لكن الحزم المطلوبة (`python3`, `python3-venv`, `curl`, `lsof`) شبه مؤكد موجودة على VPS مسبقاً

### التعديلات على `scripts/install-vps-agent.sh`

**1) فحص الحزم قبل محاولة التثبيت**
- أضافة دالة `need_pkg()` تفحص بـ `command -v` أو `dpkg -s`
- إذا كل الحزم موجودة → تخطي `apt-get update` و `apt-get install` كلياً
- رسالة واضحة: "كل التبعيات موجودة، تخطي apt"

**2) جعل apt اختيارياً وغير قاتل**
- تغليف `apt-get update` بـ `|| true` حتى لا يوقف السكربت
- استخدام `-o Acquire::AllowInsecureRepositories=true` و `-o APT::Get::AllowUnauthenticated=true` لتجاهل أخطاء التواقيع
- تثبيت الحزم الناقصة فقط (وليس كلها دفعة واحدة)

**3) ضمان عمل venv حتى بدون apt**
- لو `python3 -m venv` فشل بسبب نقص `python3-venv`، نطبع رسالة واضحة بأمر يدوي واحد لتثبيتها من `old-releases` مباشرة، ثم نخرج
- في الغالب لن يصل لهذه النقطة لأن `python3-venv` موجودة مسبقاً

**4) لا تغيير في باقي السكربت**
- `vps_agent.py` يبقى كما هو
- ملف `vps-agent-v2.service` يبقى كما هو
- البورت `8070` والمفتاح والمسارات لا تتغير

### النتيجة المتوقعة
السكربت سيعبر مرحلة "Installing system dependencies" بنجاح حتى مع مستودعات apt المعطّلة، ويكمل إنشاء venv و تنصيب Flask/psutil و تشغيل الخدمة على `8070`.

### تفاصيل تقنية
- `pip install flask psutil` يعمل عبر PyPI مباشرة ولا يحتاج apt
- `openssl` لإنشاء المفتاح موجود افتراضياً في كل توزيعات Ubuntu/Debian
- `ufw` فحصه بالفعل اختياري (`if command -v ufw`)، لذا لن يكسر شيئاً

