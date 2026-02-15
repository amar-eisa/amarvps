

## اضافة معلومات المستخدمين والحاويات وسجل الاوامر

### ملخص
اضافة 3 معلومات جديدة للوحة المراقبة:
1. معرفة اليوزر صاحب كل حاوية (Container)
2. اخر الاوامر المنفذة على السيرفر (bash_history)
3. قائمة المستخدمين على السيرفر

### المتطلبات

هذه الميزة تحتاج تعديلات على جانبين:

#### 1. تعديل الـ Agent Script على السيرفر (يدويا)
يجب تحديث سكربت Python الموجود على السيرفر في `/opt/server-monitor/agent.py` لاضافة endpoint جديد او توسيع `/status` ليشمل:

- **مالك الحاوية**: تنفيذ امر `docker inspect` لمعرفة من شغل كل حاوية، والبحث في `.bash_history` لكل يوزر عن اسم الحاوية
- **المستخدمين**: قراءة مجلدات `/home` واضافة `/root`
- **سجل الاوامر**: قراءة اخر 50 سطر من `.bash_history` لكل يوزر

الكود المطلوب اضافته للـ Agent (Python):

```text
# في دالة get_status او endpoint جديد:

import os
import subprocess

def get_users():
    users = []
    # /root
    if os.path.exists("/root"):
        users.append({"name": "root", "home": "/root"})
    # /home/*
    if os.path.exists("/home"):
        for name in os.listdir("/home"):
            path = os.path.join("/home", name)
            if os.path.isdir(path):
                users.append({"name": name, "home": path})
    return users

def get_recent_commands(users, limit=50):
    commands = []
    for user in users:
        history_file = os.path.join(user["home"], ".bash_history")
        if os.path.exists(history_file):
            try:
                with open(history_file, "r", errors="ignore") as f:
                    lines = f.readlines()[-limit:]
                for line in lines:
                    cmd = line.strip()
                    if cmd:
                        commands.append({"user": user["name"], "command": cmd})
            except:
                pass
    return commands[-100:]  # اخر 100 امر اجمالي

def get_container_owners(users):
    # الحصول على الحاويات
    try:
        result = subprocess.run(
            ["docker", "ps", "-a", "--format", "{{.ID}}|{{.Names}}|{{.Status}}"],
            capture_output=True, text=True
        )
        containers = []
        for line in result.stdout.strip().split("\n"):
            if not line: continue
            parts = line.split("|")
            cid, name, status = parts[0], parts[1], parts[2]
            owner = find_owner(name, cid, users)
            containers.append({
                "id": cid, "name": name,
                "status": status, "owner": owner
            })
        return containers
    except:
        return []

def find_owner(container_name, container_id, users):
    for user in users:
        history_file = os.path.join(user["home"], ".bash_history")
        if os.path.exists(history_file):
            try:
                with open(history_file, "r", errors="ignore") as f:
                    content = f.read()
                if container_name in content or container_id in content:
                    return user["name"]
            except:
                pass
    return "unknown"
```

ثم اضافة هذه البيانات في response الـ `/status`:
```text
{
  ...البيانات_الحالية,
  "users": [...],
  "recent_commands": [...],
  "containers": [...]
}
```

#### 2. التعديلات في الواجهة الامامية (تلقائي)

**ملف `src/types/vps.ts`** - اضافة الانواع الجديدة:
- `UserInfo`: name, home
- `CommandEntry`: user, command
- `ContainerInfo`: id, name, status, owner
- اضافة الحقول الاختيارية `users?`, `recent_commands?`, `containers?` الى `VpsData`

**ملف جديد `src/components/dashboard/ContainersTable.tsx`**:
- جدول يعرض الحاويات مع اسم المالك
- اعمدة: اسم الحاوية، ID مختصر، الحالة، المالك
- تلوين الحالة (running/exited)

**ملف جديد `src/components/dashboard/RecentCommands.tsx`**:
- عرض اخر الاوامر المنفذة في شكل قائمة
- كل سطر يعرض: اسم اليوزر + الامر
- تمرير عمودي (scroll) مع حد اقصى للارتفاع
- تلوين اوامر Docker بلون مميز

**ملف جديد `src/components/dashboard/ServerUsers.tsx`**:
- عرض قائمة المستخدمين على السيرفر
- اسم اليوزر ومسار المجلد

**ملف `src/pages/Index.tsx`**:
- اضافة المكونات الثلاثة الجديدة بعد جدول الخدمات
- عرضهم بشكل شرطي (اذا توفرت البيانات)

### الترتيب
1. تحديث الانواع في `vps.ts`
2. انشاء المكونات الثلاثة الجديدة
3. تحديث صفحة `Index.tsx`
4. ستحتاج بعدها لتحديث الـ Agent Script يدويا على السيرفر لارسال البيانات الجديدة

### ملاحظة مهمة
البيانات الجديدة (المستخدمين، الاوامر، الحاويات) لن تظهر حتى يتم تحديث سكربت الـ Agent على السيرفر. ساقوم بتجهيز الواجهة الامامية بالكامل وستعرض البيانات تلقائيا عند توفرها من السيرفر.

