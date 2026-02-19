

## جلب بيانات الحاويات من ملف tebez.json

### ملخص
تعديل النظام ليدعم حقل `port` الجديد القادم من ملف `tebez.json` وعرضه في جدول الحاويات.

### ما لا يحتاج تعديل
- Edge Function (`server-monitor/index.ts`) - لا يحتاج تعديل، فهو يمرر البيانات كما هي من الـ Agent
- Hook (`useVpsData.ts`) - لا يحتاج تعديل

### التعديلات في الواجهة الامامية

#### 1. تحديث `src/types/vps.ts`
اضافة حقل `port` اختياري الى `ContainerInfo`:
```text
export interface ContainerInfo {
  id: string;
  name: string;
  status: string;
  port: string;    // جديد - من tebez.json
  owner: string;
}
```

#### 2. تحديث `src/components/dashboard/ContainersTable.tsx`
اضافة عمود "البورت" في الجدول لعرض المنفذ الخاص بكل حاوية، مع عرض "-" اذا كانت القيمة "None".

### التعديل على السيرفر (يدويا)

في ملف `/opt/server-monitor/agent.py`، استبدل دالة جلب الحاويات الحالية بقراءة الملف:

```text
import json

def get_containers_from_file():
    try:
        with open("/home/amar/tebez.json", "r") as f:
            return json.load(f)
    except Exception as e:
        print(f"Error reading tebez.json: {e}")
        return []
```

ثم في response الـ `/status`:
```text
"containers": get_containers_from_file()
```

بعد التعديل: `sudo systemctl restart server-monitor.service`

### الترتيب
1. تحديث `vps.ts` - اضافة حقل port
2. تحديث `ContainersTable.tsx` - اضافة عمود البورت
3. تحديث `agent.py` على السيرفر يدويا لقراءة الملف

