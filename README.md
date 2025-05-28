# SmartVase – Intelligent 3D Vase Design & Manufacturing System

---

## 📌 Project Overview

SmartVase is an innovative web-based platform that revolutionizes the 3D printing industry by providing an integrated solution for custom vase design, manufacturing, and quality control. The system combines interactive 3D design tools with AI-powered defect detection and automated production management.

---

## 🔑 Key Features

### 🎨 Interactive 3D Design

- Real-time 3D vase customization using Three.js  
- Multiple vase models with adjustable dimensions, colors, and textures  
- Live preview with AR visualization capabilities  
- Integrated price calculation based on material usage  

### 🤖 AI-Powered Quality Control

- YOLOv8-based defect detection system (converted to ONNX)  
- Real-time monitoring of print jobs with automatic defect detection  
- Identifies common print failures: spaghetti errors and layer shifting  
- Automatic print stopping when defects are detected  

### 📊 Admin Monitoring Dashboard

- Live video feeds of multiple printing processes  
- Real-time parameter monitoring (temperature, speed, layer height)  
- Smart analytics panel for failed print analysis  
- Comprehensive reporting system with PDF generation  

### 💰 E-commerce Integration

- PayPal payment processing  
- Automated inventory management through ERP integration  
- Order tracking and customer management  
- Multi-language support (Hebrew/English)  

---

## 🧱 Technology Stack

### Frontend

- **HTML5/CSS3** – Modern responsive design  
- **JavaScript (ES6+)** – Interactive functionality  
- **Three.js** – 3D visualization and model manipulation  
- **jQuery** – DOM manipulation and AJAX requests  

### Backend

- **PHP** – Server-side logic and API endpoints  
- **MySQL** – Database management  
- **Python** – AI model inference server  

### AI/ML

- **YOLOv8** – Object detection for defect identification  
- **ONNX Runtime** – Optimized model inference  
- **OpenCV** – Image processing  

### APIs & Services

- **PayPal SDK** – Payment processing  
- **ERP Integration** – Inventory and order management  
- **Custom REST APIs** – System communication  

### Infrastructure

- **Flask** – Python web framework for AI services  
- **Render.com** – Cloud deployment  
- **CORS handling** – Cross-origin resource sharing  

---
