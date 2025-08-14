# ⚡ Deploy Nhanh Moonne lên Server

## 🎯 **Phương án 1: Deploy lên VPS (Khuyến nghị)**

### **Bước 1: Thuê VPS**
- **DigitalOcean**: $5-10/tháng
- **Vultr**: $5-10/tháng  
- **Linode**: $5-10/tháng
- **AWS EC2**: $10-15/tháng

### **Bước 2: Kết nối VPS**
```bash
ssh root@your-server-ip
```

### **Bước 3: Cài đặt nhanh**
```bash
# Cài đặt Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Cài đặt MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod

# Cài đặt PM2
sudo npm install -g pm2

# Cài đặt Nginx
sudo apt-get install nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### **Bước 4: Upload code**
```bash
# Tạo thư mục
mkdir /var/www/moonne
cd /var/www/moonne

# Upload code (qua FTP hoặc git clone)
# Sau đó:
cd moonne/backend
npm install

cd ../src
npm install
```

### **Bước 5: Cấu hình Backend**
```bash
cd /var/www/moonne/moonne-menu/backend

# Tạo file .env
cat > .env << EOF
NODE_ENV=production
PORT=5000
JWT_SECRET=moonne-secret-key-2024
MONGODB_URI=mongodb://localhost:27017/moonne
CORS_ORIGIN=http://your-server-ip,https://your-domain.com
LOG_LEVEL=info
EOF

# Chạy với PM2
pm2 start server.js --name moonne-backend
pm2 save
pm2 startup
```

### **Bước 6: Build Frontend**
```bash
cd /var/www/moonne/moonne-menu/src

# Cập nhật API URL
sed -i 's|http://localhost:5000|http://your-server-ip:5000|g' src/services/api.js

# Build
npm run build

# Copy lên Nginx
sudo cp -r build/* /var/www/html/
```

### **Bước 7: Cấu hình Nginx**
```bash
sudo nano /etc/nginx/sites-available/moonne
```

**Nội dung:**
```nginx
server {
    listen 80;
    server_name your-server-ip;
    root /var/www/html;
    index index.html;

    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/moonne /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### **Bước 8: Mở port**
```bash
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

### **Bước 9: Test**
```bash
# Health check
curl http://your-server-ip/api/health

# Initialize demo data
curl -X POST http://your-server-ip/api/init-demo
```

**Truy cập:** `http://your-server-ip`

---

## 🎯 **Phương án 2: Deploy lên Cloud Platform**

### **Heroku (Miễn phí)**
```bash
# Cài đặt Heroku CLI
curl https://cli-assets.heroku.com/install.sh | sh

# Login
heroku login

# Tạo app
heroku create moonne-app

# Deploy backend
cd backend
heroku git:remote -a moonne-app
git add .
git commit -m "Deploy backend"
git push heroku main

# Cấu hình MongoDB
heroku addons:create mongolab:sandbox

# Deploy frontend
cd ../src
npm run build
# Upload build folder lên Heroku hoặc dùng static hosting
```

### **Vercel (Miễn phí)**
```bash
# Cài đặt Vercel CLI
npm i -g vercel

# Deploy frontend
cd src
vercel

# Deploy backend
cd ../backend
vercel
```

### **Netlify (Miễn phí)**
```bash
# Build frontend
cd src
npm run build

# Upload build folder lên Netlify
# Hoặc connect với Git repository
```

---

## 🎯 **Phương án 3: Deploy lên Local Network**

### **Cho team nội bộ**
```bash
# Trên máy chủ local
cd moonne-menu/backend
npm install
npm start

# Trên máy khác trong mạng
# Truy cập: http://ip-may-chu:5000
```

---

## 🚀 **Test nhanh**

### **1. Kiểm tra backend**
```bash
curl http://your-server-ip/api/health
```

### **2. Khởi tạo dữ liệu**
```bash
curl -X POST http://your-server-ip/api/init-demo
```

### **3. Test login**
- URL: `http://your-server-ip`
- Username: `admin`
- Password: `admin123`

### **4. Test với nhiều user**
- Mở nhiều tab browser
- Login với các tài khoản khác nhau:
  - `user1/user123` (XNK)
  - `user2/user123` (FK)
  - `user3/user123` (CSKH)

---

## 📊 **Monitoring**

### **Kiểm tra logs**
```bash
# Backend logs
pm2 logs moonne-backend

# Nginx logs
sudo tail -f /var/log/nginx/access.log

# MongoDB logs
sudo tail -f /var/log/mongodb/mongod.log
```

### **Kiểm tra status**
```bash
# PM2 status
pm2 status

# Service status
sudo systemctl status nginx
sudo systemctl status mongod
```

---

## 🔧 **Troubleshooting**

### **Lỗi thường gặp:**

1. **Port 5000 không mở**
```bash
sudo ufw allow 5000
```

2. **CORS error**
```bash
# Cập nhật CORS_ORIGIN trong .env
CORS_ORIGIN=http://your-server-ip,http://localhost:3000
```

3. **MongoDB không kết nối**
```bash
sudo systemctl restart mongod
```

4. **PM2 không start**
```bash
pm2 delete moonne-backend
pm2 start server.js --name moonne-backend
```

---

## 💰 **Chi phí ước tính:**

- **VPS cơ bản**: $5-10/tháng
- **Domain name**: $10-15/năm
- **SSL certificate**: Miễn phí (Let's Encrypt)
- **MongoDB Atlas**: Miễn phí (512MB)

**Tổng**: ~$70-120/năm

---

## 🎉 **Kết quả:**

Sau khi deploy thành công:
- ✅ Web chạy 24/7
- ✅ Nhiều người có thể truy cập cùng lúc
- ✅ Dữ liệu được lưu trữ an toàn
- ✅ Có thể truy cập từ mọi nơi
- ✅ Dễ dàng backup và restore

**URL demo:** `http://your-server-ip` 