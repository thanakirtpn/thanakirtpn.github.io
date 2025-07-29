FROM nginx:alpine

# ลบ default config แล้วใช้ของเราเอง
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# คัดลอกไฟล์เว็บทั้งหมดเข้า nginx html root
COPY public/ /usr/share/nginx/html/

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]