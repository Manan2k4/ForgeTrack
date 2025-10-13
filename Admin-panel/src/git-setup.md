# Git Repository Setup

## Creating Your Own Repository

1. **Download all files** from Figma Make to a local directory

2. **Initialize git repository:**
   ```bash
   cd employee-management-system
   git init
   ```

3. **Create .gitignore:**
   ```bash
   cat > .gitignore << EOL
   # Dependencies
   node_modules/
   backend/node_modules/
   
   # Environment files
   .env
   backend/.env
   
   # Build outputs
   build/
   dist/
   
   # Logs
   npm-debug.log*
   yarn-debug.log*
   yarn-error.log*
   
   # Runtime data
   pids
   *.pid
   *.seed
   *.pid.lock
   
   # OS generated files
   .DS_Store
   .DS_Store?
   ._*
   .Spotlight-V100
   .Trashes
   ehthumbs.db
   Thumbs.db
   
   # IDE files
   .vscode/
   .idea/
   *.swp
   *.swo
   
   # Temporary files
   *.tmp
   *.temp
   EOL
   ```

4. **Add files to git:**
   ```bash
   git add .
   git commit -m "Initial commit: Employee Management System"
   ```

5. **Create GitHub repository** (optional):
   - Go to GitHub.com
   - Create new repository
   - Follow GitHub's instructions to push existing repository

6. **Push to GitHub:**
   ```bash
   git branch -M main
   git remote add origin https://github.com/yourusername/employee-management-system.git
   git push -u origin main
   ```

## Repository Structure
```
employee-management-system/
├── README.md                    # Add project description
├── .gitignore                  # Ignore sensitive files
├── [all your project files]
```

## Recommended README.md Content
```markdown
# Employee Management System

A full-stack web application for managing employees and work logs.

## Features
- 📱 Mobile-responsive admin panel
- 👥 Employee management (CRUD operations)
- 📦 Product management (Rod, Sleeve, Pin types)
- 📊 Work logging and statistics
- 🔐 JWT authentication
- 🗄️ MongoDB Atlas integration

## Quick Start
1. Clone the repository
2. Run `npm run setup`
3. Configure MongoDB Atlas in `backend/.env`
4. Start backend: `cd backend && npm run dev`
5. Start frontend: `npm start`

## Tech Stack
- **Frontend:** React, TypeScript, Tailwind CSS, Shadcn/UI
- **Backend:** Node.js, Express.js, MongoDB, JWT
- **Database:** MongoDB Atlas
```