import React from "react";

const App = () => {
  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="bg-gray-900 w-64 min-w-[16rem] p-5 shadow-md text-white">
        <h1 className="text-xl font-bold mb-6">ForgeTrack Admin</h1>
        <nav className="space-y-4">
          <button className="w-full text-left px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800">
            🧑‍🏭 Employees
          </button>
          <button className="w-full text-left px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800">
            🚚 Transporters
          </button>
          <button className="w-full text-left px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800">
            📊 Reports
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 bg-gray-100 p-6 overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800">Dashboard</h2>
          <button className="bg-red-500 text-white px-4 py-2 rounded">Logout</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded shadow text-gray-800">Total Employees: 24</div>
          <div className="bg-white p-5 rounded shadow text-gray-800">Deliveries Today: 5</div>
          <div className="bg-white p-5 rounded shadow text-gray-800">Pending Logs: 8</div>
        </div>
      </main>
    </div>
  );
};

export default App;
