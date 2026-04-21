

## إبقاء Lovable Cloud نشطاً دائماً

### المشكلة
مشروع Lovable Cloud (قاعدة البيانات وEdge Functions) يدخل في وضع السكون (pause) بعد فترة من عدم الاستخدام. عند فتح الموقع بعد فترة طويلة، يحتاج Cloud وقتاً ليستيقظ، مما يسبب بطء أو فشل في أول طلب (504 / timeout).

### السبب
مشاريع Lovable Cloud على الخطط المجانية/الأساسية تدخل في **وضع السكون التلقائي** عند عدم وجود نشاط لفترة. هذا سلوك من البنية التحتية لتوفير الموارد، وليس خطأ في الكود.

### الحلول المتاحة

#### الحل 1: Keep-Alive Cron Job (موصى به - مجاني)
إنشاء cron job يستدعي edge function بشكل دوري كل 5 دقائق لإبقاء Cloud مستيقظاً.

**الخطوات:**
1. إنشاء edge function جديدة `keep-alive` تقوم بـ:
   - استعلام بسيط على قاعدة البيانات (مثل `SELECT 1`)
   - إرجاع استجابة سريعة
2. تفعيل الـ extensions المطلوبة في قاعدة البيانات:
   - `pg_cron` - لجدولة المهام
   - `pg_net` - لاستدعاء HTTP من داخل Postgres
3. إنشاء cron job يعمل كل 5 دقائق ويستدعي `keep-alive`:
```text
SELECT cron.schedule(
  'keep-alive-ping',
  '*/5 * * * *',
  $$ SELECT net.http_post(
    url := 'https://wlmvzdhvvbbqidhvrdsh.supabase.co/functions/v1/keep-alive',
    headers := '{"Content-Type": "application/json"}'::jsonb
  ); $$
);
```

#### الحل 2: ترقية حجم الـ Instance (الأكثر موثوقية)
من داخل Lovable: **Cloud → Advanced settings → Upgrade instance**
- instances الأكبر لا تدخل في السكون بنفس السرعة
- أداء أفضل بشكل عام
- تكلفة إضافية على استخدام Cloud

#### الحل 3: تحسين Edge Function الحالية (مكمل)
رفع مهلة الاتصال في `server-monitor` من 20 ثانية إلى 30 ثانية، وإضافة retry واحد تلقائي عند فشل أول محاولة (للتعامل مع cold start).

### التوصية
البدء بـ **الحل 1 (Keep-Alive)** لأنه مجاني وفعال. إذا استمرت المشكلة أو زاد حجم المشروع، الانتقال للحل 2.

### الملفات التي سيتم تعديلها/إنشاؤها
1. **إنشاء** `supabase/functions/keep-alive/index.ts` - edge function خفيفة
2. **إنشاء migration** لتفعيل `pg_cron` + `pg_net` وجدولة المهمة
3. **تعديل** `supabase/functions/server-monitor/index.ts` - إضافة retry logic لأول محاولة

### ملاحظة
هذا الحل يبقي Lovable Cloud (قاعدة البيانات + Edge Functions) نشطاً. أما الـ VPS Agent الخاص بك على `5.189.155.145:8050` فهو مستقل تماماً ولا يتأثر بهذه المشكلة.

