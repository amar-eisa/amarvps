

## خطة إعادة التثبيت من الصفر بأسماء جديدة

### المفهوم
بدل محاولة إصلاح الفوضى الحالية على VPS، سنُنشئ نظاماً موازياً بأسماء جديدة تماماً وعلى بورت جديد `8070`. الملفات القديمة تبقى كما هي (لا نلمسها) ثم نعطّلها لاحقاً بعد التأكد أن الجديد يعمل.

---

### الأسماء الجديدة المقترحة

| العنصر | الاسم القديم | الاسم الجديد |
|---|---|---|
| مجلد العمل | `/opt/server-monitor/` | `/opt/vps-agent-v2/` |
| ملف Python | `agent.py` | `vps_agent.py` |
| خدمة systemd | `server-monitor.service` | `vps-agent-v2.service` |
| البورت | `8050` | `8070` |
| متغير البيئة للمفتاح | `MONITOR_API_KEY` | `VPS_AGENT_KEY` |

---

### ما سأقدّمه لك (نصوص جاهزة للنسخ)

**1) سكربت تثبيت واحد (`install.sh`)** ينفّذ كل شيء على VPS:
- يُنشئ `/opt/vps-agent-v2/`
- يكتب `vps_agent.py` (نفس وظائف agent القديم + مسارات `/container/<action>`)
- يُنشئ ويُفعّل `vps-agent-v2.service` على بورت `8070`
- يُنشئ مفتاح API عشوائي ويحفظه في `/etc/vps-agent-v2.env`
- يفتح بورت `8070` في الجدار الناري إن وُجد `ufw`
- يطبع المفتاح في النهاية لتنسخه

**2) ملف `vps_agent.py` كامل** يحتوي على:
- `GET /health` و `GET /status`
- `POST /container/start|stop|restart|remove|logs`
- مصادقة عبر `X-API-Key`
- نفس البيانات التي تتوقعها اللوحة (CPU, RAM, Disk, Network, Services, Containers, Users, Recent Commands)

**3) ملف `vps-agent-v2.service`** بإعدادات نظيفة (لا crash loop, restart مع تأخير).

---

### ما سأعدّله في مشروع Lovable

**أ) تحديث Edge Function لتستخدم أسماء أسرار جديدة**
- `supabase/functions/server-monitor/index.ts`
- `supabase/functions/container-action/index.ts`

تتغير من:
```
MONITOR_HOST_URL  →  VPS_AGENT_URL
MONITOR_ACCESS_KEY → VPS_AGENT_KEY
```

**ب) إضافة الأسرار الثلاثة الجديدة عبر Lovable Cloud:**
- `VPS_AGENT_URL` = `http://YOUR_VPS_IP:8070`
- `VPS_AGENT_KEY` = المفتاح الذي يطبعه سكربت التثبيت
- (الأسرار القديمة تبقى لكن لن تُستخدم)

---

### خطوات التنفيذ بترتيب واضح

#### على VPS (أنت):
1. انسخ سكربت `install.sh` إلى ملف على VPS
2. شغّله: `sudo bash install.sh`
3. انسخ المفتاح الذي يطبعه في النهاية
4. تحقق: `curl http://localhost:8070/health` → يجب أن يرجع `{"ok":true}`

#### في Lovable (أنا):
5. أُعدّل ملفّي Edge Functions ليستخدما الأسرار الجديدة
6. أطلب منك إدخال `VPS_AGENT_URL` و `VPS_AGENT_KEY` في Lovable Cloud
7. بعد الإدخال، أزرار اللوحة ستعمل فوراً

#### تنظيف لاحق (اختياري بعد التأكد):
8. إيقاف الخدمة القديمة:
```bash
sudo systemctl stop server-monitor
sudo systemctl disable server-monitor
sudo kill -9 911   # العملية القديمة على 8050
```

---

### تفاصيل تقنية

- البورت `8070` مختار لأنه نادر الاستخدام ولا يتعارض مع شيء معروف
- المفتاح سيُولَّد بـ `openssl rand -hex 32` (64 حرف)
- الخدمة الجديدة ستعمل بـ `Restart=on-failure` و `RestartSec=5` لمنع crash loop
- لن أعدّل أي ملف من ملفات الـ agent القديمة على VPS — فقط أُنشئ جديداً منفصلاً

---

### النتيجة المتوقعة
بعد التنفيذ:
```
عملية vps_agent.py على بورت 8070  ←  Edge Functions جديدة  ←  لوحة Lovable
                                    (تستخدم VPS_AGENT_URL/KEY)
```

لا تعارض مع القديم، لا 404، ولا حاجة لتشخيص الفوضى السابقة.

