// Database Configuration
// ===================
// Add your MongoDB Atlas connection string in the backend/.env file
// This file handles the API endpoints and database connection configuration

interface DatabaseConfig {
  apiBaseUrl: string;
  endpoints: {
    auth: {
      login: string;
      register: string;
      verify: string;
    };
    users: {
      base: string;
      byId: (id: string) => string;
    };
    products: {
      base: string;
      byType: (type: string) => string;
      byId: (id: string) => string;
    };
    workLogs: {
      base: string;
      byEmployee: (employeeId: string) => string;
      byDate: (date: string) => string;
    };
  };
}

// Configuration for different environments
const config: DatabaseConfig = {
  // Backend API URL - Update this to match your backend server
  apiBaseUrl: process.env.NODE_ENV === 'production' 
    ? 'https://your-backend-domain.com/api'  // Replace with your production URL
    : 'http://localhost:5000/api',            // Development URL

  endpoints: {
    auth: {
      login: '/auth/login',
      register: '/auth/register', 
      verify: '/auth/verify'
    },
    users: {
      base: '/users',
      byId: (id: string) => `/users/${id}`
    },
    products: {
      base: '/products',
      byType: (type: string) => `/products?type=${type}`,
      byId: (id: string) => `/products/${id}`
    },
    workLogs: {
      base: '/work-logs',
      byEmployee: (employeeId: string) => `/work-logs?employeeId=${employeeId}`,
      byDate: (date: string) => `/work-logs?date=${date}`
    }
  }
};

export default config;

// Helper function to build full URLs
export const buildUrl = (endpoint: string): string => {
  return `${config.apiBaseUrl}${endpoint}`;
};

// Connection status checker
export const checkDatabaseConnection = async (): Promise<boolean> => {
  try {
    const response = await fetch(buildUrl('/health'), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return response.ok;
  } catch (error) {
    console.log('Database connection check failed:', error);
    return false;
  }
};

// Instructions for setting up MongoDB Atlas connection
export const SETUP_INSTRUCTIONS = `
🔧 MongoDB Atlas Setup Instructions:
=====================================

1. **Create a .env file in the backend folder:**
   Copy backend/.env.example to backend/.env

2. **Add your MongoDB Atlas connection string:**
   MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/<database-name>?retryWrites=true&w=majority
   
   Replace:
   - <username>: Your MongoDB Atlas username
   - <password>: Your MongoDB Atlas password  
   - <cluster-url>: Your cluster URL (e.g., cluster0.abcde.mongodb.net)
   - <database-name>: Your database name (e.g., employee_management)

3. **Generate a JWT secret:**
   JWT_SECRET=your-super-secret-jwt-key-here
   
4. **Set your frontend URL:**
   FRONTEND_URL=http://localhost:3000

5. **Install backend dependencies:**
   cd backend && npm install

6. **Start the backend server:**
   npm start

📱 The employee portal will automatically:
- Use the database when online and connected
- Fall back to localStorage when offline
- Sync data when connection is restored
`;

export { config };