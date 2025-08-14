# 🚀 Hướng dẫn Deploy Moonne lên Server

## 📋 **Yêu cầu hệ thống:**

- **Server/VPS**: Ubuntu 20.04+ hoặc CentOS 7+
- **Node.js**: Version 14.0.0 trở lên
- **MongoDB**: Version 4.4+ hoặc MongoDB Atlas
- **Nginx**: Web server (tùy chọn)
- **PM2**: Process manager (khuyến nghị)

## 🔧 **Bước 1: Chuẩn bị Server**

### 1.1 Cài đặt Node.js
```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# CentOS/RHEL
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs
```

### 1.2 Cài đặt MongoDB
```bash
# Ubuntu/Debian
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod

# Hoặc sử dụng MongoDB Atlas (cloud)
```

### 1.3 Cài đặt PM2
```bash
sudo npm install -g pm2
```

### 1.4 Cài đặt Nginx (tùy chọn)
```bash
sudo apt-get install nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

## 📦 **Bước 2: Upload Code lên Server**

### 2.1 Clone hoặc upload code
```bash
# Cách 1: Git clone
git clone https://github.com/your-repo/moonne.git
cd moonne

# Cách 2: Upload qua FTP/SFTP
# Upload toàn bộ thư mục moonne lên server
```

### 2.2 Cài đặt dependencies
```bash
# Backend
cd backend
npm install

# Frontend
cd ../src
npm install
```

## ⚙️ **Bước 3: Cấu hình Backend**

### 3.1 Tạo file .env
```bash
cd backend
cp config.env .env
nano .env
```

**Nội dung file .env:**
```env
NODE_ENV=production
PORT=5000
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
MONGODB_URI=mongodb://localhost:27017/moonne
CORS_ORIGIN=https://yourdomain.com,http://yourdomain.com
LOG_LEVEL=info
```

### 3.2 Chạy Backend với PM2
```bash
cd backend
pm2 start server.js --name moonne-backend
pm2 save
pm2 startup
```

## 🌐 **Bước 4: Build và Deploy Frontend**

### 4.1 Build production
```bash
cd src
# Thay đổi API URL trong package.json
npm run build:prod
```

### 4.2 Deploy với Nginx
```bash
# Copy build files
sudo cp -r build/* /var/www/html/

# Cấu hình Nginx
sudo nano /etc/nginx/sites-available/moonne
```

**Nội dung cấu hình Nginx:**
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    root /var/www/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;

    # API proxy
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # React Router support
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static files
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/moonne /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 🔒 **Bước 5: Bảo mật**

### 5.1 Cấu hình Firewall
```bash
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

### 5.2 SSL Certificate (Let's Encrypt)
```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### 5.3 Cập nhật JWT Secret
```bash
# Tạo secret mạnh
openssl rand -base64 32
# Cập nhật vào file .env
```

## 📊 **Bước 6: Monitoring**

### 6.1 PM2 Monitoring
```bash
pm2 monit
pm2 logs moonne-backend
```

### 6.2 Nginx Logs
```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## 🚀 **Bước 7: Test**

### 7.1 Health Check
```bash
curl https://yourdomain.com/api/health
```

### 7.2 Initialize Demo Data
```bash
curl -X POST https://yourdomain.com/api/init-demo
```

### 7.3 Test Login
- Truy cập: `https://yourdomain.com`
- Login với: `admin/admin123`

## 🔄 **Bước 8: Maintenance**

### 8.1 Update Code
```bash
cd moonne
git pull origin main

# Backend
cd backend
npm install
pm2 restart moonne-backend

# Frontend
cd ../src
npm install
npm run build:prod
sudo cp -r build/* /var/www/html/
```

### 8.2 Backup Database
```bash
# MongoDB backup
mongodump --db moonne --out /backup/$(date +%Y%m%d)
```

## 📞 **Troubleshooting**

### Lỗi thường gặp:
1. **Port 5000 bị block**: Kiểm tra firewall
2. **CORS error**: Cập nhật CORS_ORIGIN trong .env
3. **MongoDB connection**: Kiểm tra MongoDB service
4. **PM2 không start**: Kiểm tra logs với `pm2 logs`

### Commands hữu ích:
```bash
# Restart services
pm2 restart moonne-backend
sudo systemctl restart nginx
sudo systemctl restart mongod

# Check status
pm2 status
sudo systemctl status nginx
sudo systemctl status mongod

# View logs
pm2 logs moonne-backend --lines 100
sudo journalctl -u nginx -f
```

## 🌟 **Kết quả:**

Sau khi hoàn thành, bạn sẽ có:
- ✅ Backend API chạy trên port 5000
- ✅ Frontend React app chạy trên domain chính
- ✅ SSL certificate bảo mật
- ✅ PM2 process management
- ✅ Nginx reverse proxy
- ✅ MongoDB database
- ✅ Monitoring và logging

**URL truy cập:** `https://yourdomain.com`

**Demo accounts:**
- admin/admin123 (Quản lý)
- user1/user123 (XNK)
- user2/user123 (FK)
- user3/user123 (CSKH) 