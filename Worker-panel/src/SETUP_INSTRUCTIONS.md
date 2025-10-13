# Employee Management System - Local Setup Guide

This guide will help you set up and run the Employee Management System on your local machine with MongoDB Atlas integration.

## Prerequisites

Make sure you have the following installed on your system:
- Node.js (version 16 or higher) - [Download here](https://nodejs.org/)
- npm or yarn package manager
- A MongoDB Atlas account - [Sign up here](https://www.mongodb.com/cloud/atlas)

## 1. MongoDB Atlas Setup

1. **Create a MongoDB Atlas Account** (if you don't have one):
   - Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
   - Sign up for a free account

2. **Create a Cluster**:
   - Create a new cluster (M0 Sandbox is free)
   - Choose your preferred region
   - Wait for the cluster to be created (takes 1-3 minutes)

3. **Set up Database Access**:
   - Go to "Database Access" in the left sidebar
   - Click "Add New Database User"
   - Choose "Password" authentication
   - Create a username and strong password
   - Set database user privileges to "Atlas admin" or "Read and write to any database"
   - Click "Add User"

4. **Set up Network Access**:
   - Go to "Network Access" in the left sidebar
   - Click "Add IP Address"
   - Click "Allow Access from Anywhere" (for development) or add your specific IP
   - Click "Confirm"

5. **Get Connection String**:
   - Go to "Clusters" and click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string (it looks like: `mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/<database-name>?retryWrites=true&w=majority`)

## 2. Backend Setup

1. **Navigate to the backend directory**:
   ```bash
   cd backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Create environment file**:
   ```bash
   cp .env.example .env
   ```

4. **Configure environment variables**:
   Open the `.env` file and update the following:
   
   ```env
   # Replace with your MongoDB Atlas connection string
   MONGODB_URI=mongodb+srv://yourusername:yourpassword@cluster0.xxxxx.mongodb.net/employee-management?retryWrites=true&w=majority
   
   # Generate a random secret key (you can use: openssl rand -base64 32)
   JWT_SECRET=your-super-secret-jwt-key-here-make-it-long-and-random
   
   # Server port
   PORT=5000
   
   # Frontend URL for CORS
   FRONTEND_URL=http://localhost:3000
   ```

   **Important**: Replace the MongoDB connection string with your actual values:
   - `yourusername`: Your MongoDB Atlas database user username
   - `yourpassword`: Your MongoDB Atlas database user password
   - `cluster0.xxxxx`: Your actual cluster address
   - `employee-management`: Your desired database name

5. **Start the backend server**:
   ```bash
   # For development (with auto-reload)
   npm run dev
   
   # OR for production
   npm start
   ```

   You should see:
   ```
   🚀 Server running on port 5000
   🌐 API available at http://localhost:5000
   ✅ Connected to MongoDB Atlas
   ```

## 3. Frontend Setup

1. **Open a new terminal** and navigate to the frontend directory:
   ```bash
   cd .. # if you're in the backend directory
   ```

2. **Install dependencies** (if not already installed):
   ```bash
   npm install
   ```

3. **Create environment file for frontend**:
   Create a `.env` file in the root directory:
   ```env
   REACT_APP_API_URL=http://localhost:5000/api
   ```

4. **Start the frontend**:
   ```bash
   npm start
   ```

   The application will open at `http://localhost:3000`

## 4. Initialize the Application

1. **First time setup**: When you first access the application, it will automatically create a default admin account with:
   - Username: `admin`
   - Password: `admin123`

2. **Login**: Use these credentials to log in as an administrator.

## 5. Project Structure

```
employee-management-system/
├── backend/                 # Backend API server
│   ├── models/             # MongoDB models
│   ├── routes/             # API routes
│   ├── middleware/         # Authentication middleware
│   ├── server.js           # Main server file
│   ├── package.json        # Backend dependencies
│   └── .env               # Environment variables
├── services/               # Frontend API service
├── components/            # React components
├── App.tsx               # Main React component
├── package.json          # Frontend dependencies
└── .env                  # Frontend environment variables
```

## 6. Key Features

### Admin Features:
- ✅ Add/Remove employees
- ✅ Manage products (Rod, Sleeve, Pin)
- ✅ View work logs with filtering
- ✅ Mobile-responsive admin panel

### Employee Features:
- ✅ Login with auto-save
- ✅ Select job types (Rod, Sleeve, Pin)
- ✅ Submit work entries
- ✅ Dynamic forms based on product availability

## 7. API Endpoints

- `POST /api/auth/login` - User login
- `GET /api/users/employees` - Get all employees (admin)
- `POST /api/users/employees` - Create employee (admin)
- `DELETE /api/users/employees/:id` - Delete employee (admin)
- `GET /api/products` - Get all products
- `POST /api/products` - Create product (admin)
- `PUT /api/products/:id` - Update product (admin)
- `DELETE /api/products/:id` - Delete product (admin)
- `GET /api/work-logs` - Get work logs
- `POST /api/work-logs` - Create work log
- `GET /api/work-logs/stats` - Get work statistics (admin)

## 8. Troubleshooting

### Backend won't start:
- Check that MongoDB connection string is correct
- Ensure MongoDB Atlas cluster is running
- Verify network access is configured correctly
- Check that all environment variables are set

### Frontend won't connect to backend:
- Ensure backend is running on port 5000
- Check that REACT_APP_API_URL is set correctly
- Verify CORS is configured properly in backend

### Login issues:
- Try the init endpoint to create admin: `POST http://localhost:5000/api/auth/init`
- Clear browser localStorage and try again
- Check browser console for any errors

### MongoDB Connection Issues:
- Double-check username and password in connection string
- Ensure special characters in password are URL-encoded
- Verify IP address is whitelisted in MongoDB Atlas
- Check that cluster is not paused (free tier clusters pause after inactivity)

## 9. Production Deployment

For production deployment:

1. **Backend**: Deploy to services like Heroku, Railway, or AWS
2. **Frontend**: Deploy to Vercel, Netlify, or similar
3. **Update CORS settings** in backend for production domain
4. **Update API_URL** in frontend environment variables
5. **Use strong JWT secrets** and secure environment variables

## 10. Support

If you encounter any issues:
1. Check the console logs for detailed error messages
2. Ensure all environment variables are correctly set
3. Verify MongoDB Atlas connection and permissions
4. Check that both backend and frontend are running

---

**Note**: This setup uses JWT tokens stored in localStorage for authentication. In a production environment, consider implementing more secure authentication methods like HTTP-only cookies.