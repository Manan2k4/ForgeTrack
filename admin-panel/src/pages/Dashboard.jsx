// src/pages/Dashboard.jsx

import React from "react";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    // Clear session (if implemented)
    navigate("/");
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="bg-white md:w-64 w-full border-r border-gray-300 px-6 py-4">
        {/* Logo + Title */}


        {/* Sidebar Content */}
        <h2 className="text-lg font-semibold mb-4">Dashboard</h2>
        <div className="flex flex-col gap-3">
          <button className="bg-black text-white py-2 rounded hover:bg-gray-800">
            Add Employee
          </button>
          <button className="bg-black text-white py-2 rounded hover:bg-gray-800">
            Remove Employee
          </button>
          <button className="bg-black text-white py-2 rounded hover:bg-gray-800">
            Monitor Employee
          </button>
          <button className="bg-black text-white py-2 rounded hover:bg-gray-800">
            Add Delivery
          </button>
          <button className="bg-black text-white py-2 rounded hover:bg-gray-800">
            Track Delivery
          </button>
        </div>

        <button
          onClick={handleLogout}
          className="bg-red-500 text-white w-full mt-6 py-2 rounded hover:bg-red-600"
        >
          Logout
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 px-6 py-8 bg-white">
        <h2 className="text-2xl font-semibold mb-6">Admin Dashboard</h2>

        <div className="border p-4 rounded bg-gray-100">
          <h3 className="text-lg font-semibold mb-2">Today's log:</h3>
          <ul className="list-disc ml-5 text-gray-800 space-y-1">
            <li>Misra - A6 - Hero Splendor - 125mm - 100</li>
            <li>Yadav - A0 - Honda Shine - 100mm - 150</li>
            <li>...</li>
            <li>...</li>
          </ul>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
