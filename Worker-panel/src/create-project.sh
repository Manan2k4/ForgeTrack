#!/bin/bash

# Employee Management System Project Creator
echo "🚀 Creating Employee Management System project structure..."

# Create main directories
mkdir -p employee-management-system
cd employee-management-system

# Create frontend structure
mkdir -p components/{admin,employee,ui,figma}
mkdir -p services
mkdir -p styles

# Create backend structure
mkdir -p backend/{models,routes,middleware}

# Create placeholder files (you'll need to copy content from Figma Make)
touch App.tsx
touch package.json
touch setup.js
touch SETUP_INSTRUCTIONS.md

# Frontend components
touch components/AdminDashboard.tsx
touch components/EmployeePortal.tsx
touch components/LoginForm.tsx
touch components/admin/AddEmployee.tsx
touch components/admin/AddProduct.tsx
touch components/admin/ManageEmployees.tsx
touch components/admin/ViewLogs.tsx
touch components/employee/WorkForm.tsx

# Services
touch services/api.ts

# Styles
touch styles/globals.css

# Backend files
touch backend/server.js
touch backend/package.json
touch backend/.env.example

# Models
touch backend/models/User.js
touch backend/models/Product.js
touch backend/models/WorkLog.js

# Routes
touch backend/routes/auth.js
touch backend/routes/users.js
touch backend/routes/products.js
touch backend/routes/workLogs.js

# Middleware
touch backend/middleware/auth.js

echo "✅ Project structure created!"
echo "📝 Now copy the file contents from Figma Make to each file"
echo "📋 Then follow the setup instructions in SETUP_INSTRUCTIONS.md"