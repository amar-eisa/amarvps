# المرحلة الأولى: بناء المشروع
FROM node:20-alpine AS build
WORKDIR /app

# نسخ ملفات الاعتماديات وتثبيتها
COPY package.json package-lock.json* bun.lock* ./
RUN npm install

# نسخ باقي ملفات المشروع 
# (ملاحظة: سيتم نسخ ملف .env الذي أنشأته على السيرفر هنا ليُستخدم أثناء البناء)
COPY . .
RUN npm run build

# المرحلة الثانية: تشغيل خادم Nginx
FROM nginx:alpine

# إزالة إعدادات Nginx الافتراضية وإضافة إعداد يدعم React Router
RUN rm /etc/nginx/conf.d/default.conf
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

# نسخ الملفات المبنية من المرحلة السابقة إلى مجلد Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# كشف منفذ 80 داخل الحاوية
EXPOSE 80

# تشغيل Nginx
CMD ["nginx", "-g", "daemon off;"]