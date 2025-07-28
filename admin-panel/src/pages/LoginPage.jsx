// src/pages/LoginPage.jsx

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const LoginPage = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();

    // Dummy auth logic (replace with actual DB check)
    if (username === "admin" && password === "admin123") {
      navigate("/dashboard");
    } else {
      alert("Invalid credentials");
    }
  };

  return (
    // Change this outer div
    <div className="flex items-center justify-center min-h-screen bg-gray-100 selection:bg-yellow-100 selection:text-black">
      {/* This inner div is fine with w-full max-w-md */}
      <div className="w-full max-w-md bg-white border border-gray-300 p-8 shadow-lg rounded">
        {/* Logo + Title */}
        <div className="mb-8 text-center">
          <img
            src="/src/assets/prince-logo.png"
            alt="Prince Logo"
            className="mx-auto mb-2 w-28"
          />
          <h2 className="text-xl font-semibold mt-4 text-gray-800">Admin Login</h2>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block font-semibold text-gray-700 mb-1">Username:</label>
            <input
              type="text"
              className="w-full px-4 py-2 border bg-gray-100 text-gray-800 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block font-semibold text-gray-700 mb-1">Password:</label>
            <input
              type="password"
              className="w-full px-4 py-2 border bg-gray-100 text-gray-800 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-black text-white py-2 font-semibold hover:bg-gray-900 rounded"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;