# المرحلة الأولى: بناء المشروع
FROM node:20-alpine AS build
WORKDIR /app

# نسخ ملفات الاعتماديات وتثبيتها
COPY package.json package-lock.json* bun.lock* ./
RUN npm install

# نسخ باقي ملفات المشروع وبناء نسخة الإنتاج
COPY . .
RUN npm run build

# المرحلة الثانية: تشغيل خادم Nginx
FROM nginx:alpine
# نسخ الملفات المبنية من المرحلة السابقة إلى مجلد Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# كشف منفذ 80 داخل الحاوية
EXPOSE 80

# تشغيل Nginx
CMD ["nginx", "-g", "daemon off;"]
