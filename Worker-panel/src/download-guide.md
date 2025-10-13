# Download and Setup Guide

## Option 1: From Figma Make
1. Use Figma Make's export/download feature to get all project files
2. Extract to your desired directory
3. Follow the setup steps below

## Option 2: Manual Setup
If you need to recreate the project manually, here's the complete file structure:

```
employee-management-system/
├── App.tsx                          # Main React component
├── package.json                     # Frontend dependencies
├── setup.js                        # Automated setup script
├── SETUP_INSTRUCTIONS.md           # Detailed setup guide
├── services/
│   └── api.ts                      # API service layer
├── components/
│   ├── AdminDashboard.tsx          # Admin interface
│   ├── EmployeePortal.tsx          # Employee interface  
│   ├── LoginForm.tsx               # Login component
│   ├── admin/                      # Admin-specific components
│   │   ├── AddEmployee.tsx
│   │   ├── AddProduct.tsx
│   │   ├── ManageEmployees.tsx
│   │   └── ViewLogs.tsx
│   ├── employee/
│   │   └── WorkForm.tsx            # Work logging form
│   └── ui/                         # Reusable UI components (shadcn)
│       ├── [all the shadcn components]
├── styles/
│   └── globals.css                 # Tailwind v4 styles
├── backend/                        # Node.js/Express API
│   ├── package.json               # Backend dependencies
│   ├── server.js                  # Main server file
│   ├── .env.example              # Environment template
│   ├── models/                   # MongoDB models
│   │   ├── User.js
│   │   ├── Product.js
│   │   └── WorkLog.js
│   ├── routes/                   # API routes
│   │   ├── auth.js
│   │   ├── users.js
│   │   ├── products.js
│   │   └── workLogs.js
│   └── middleware/
│       └── auth.js               # JWT authentication
```

## Quick Setup After Download

1. **Navigate to project directory:**
   ```bash
   cd employee-management-system
   ```

2. **Run automated setup:**
   ```bash
   npm run setup
   ```

3. **Configure MongoDB Atlas:**
   - Open `backend/.env`
   - Add your MongoDB Atlas connection string
   - Set a secure JWT secret

4. **Start backend:**
   ```bash
   cd backend
   npm run dev
   ```

5. **Start frontend (new terminal):**
   ```bash
   npm start
   ```

6. **Access application:**
   - Frontend: http://localhost:3000
   - Backend: http://localhost:5000
   - Login: admin/admin123

## MongoDB Atlas Setup
1. Create account at https://cloud.mongodb.com
2. Create a cluster (M0 free tier)
3. Set up database user with read/write permissions
4. Whitelist IP address (0.0.0.0/0 for development)
5. Get connection string and add to `backend/.env`

## Project Features
✅ Mobile-responsive admin panel
✅ Employee work logging system
✅ Product management (Rod, Sleeve, Pin)
✅ JWT authentication
✅ MongoDB Atlas integration
✅ Real-time work logs
✅ Advanced filtering and statistics