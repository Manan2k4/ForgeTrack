// Demo data for testing the enhanced employee portal
// This data will be used when no backend connection is available

export const initializeDemoData = () => {
  // Demo users
  const demoUsers = [
    {
      id: 'demo-1',
      username: 'demo',
      role: 'employee',
      name: 'Demo Employee',
      department: 'Production'
    },
    {
      id: 'emp-1',
      username: 'employee1',
      role: 'employee',
      name: 'John Doe',
      department: 'Manufacturing'
    },
    {
      id: 'emp-2',
      username: 'employee2',
      role: 'employee',
      name: 'Jane Smith',
      department: 'Assembly'
    }
  ];

  // Demo products
  const demoProducts = [
    // Rod products
    {
      id: 'rod-1',
      type: 'rod',
      partName: 'Steel Rod A',
      sizes: ['10mm', '15mm', '20mm', '25mm']
    },
    {
      id: 'rod-2',
      type: 'rod',
      partName: 'Aluminum Rod B',
      sizes: ['12mm', '18mm', '24mm']
    },
    {
      id: 'rod-3',
      type: 'rod',
      partName: 'Brass Rod C',
      sizes: ['8mm', '16mm', '32mm']
    },
    // Sleeve products
    {
      id: 'sleeve-1',
      type: 'sleeve',
      code: 'SLV-001',
      sizes: ['Small', 'Medium', 'Large']
    },
    {
      id: 'sleeve-2',
      type: 'sleeve',
      code: 'SLV-002',
      sizes: ['XS', 'S', 'M', 'L', 'XL']
    },
    {
      id: 'sleeve-3',
      type: 'sleeve',
      code: 'SLV-003',
      sizes: ['Type A', 'Type B', 'Type C']
    },
    // Pin products
    {
      id: 'pin-1',
      type: 'pin',
      partName: 'Standard Pin',
      sizes: ['3mm', '5mm', '8mm']
    },
    {
      id: 'pin-2',
      type: 'pin',
      partName: 'Heavy Duty Pin',
      sizes: ['6mm', '10mm', '12mm']
    },
    {
      id: 'pin-3',
      type: 'pin',
      partName: 'Precision Pin',
      sizes: ['2mm', '4mm', '6mm', '8mm']
    }
  ];

  // Demo work logs (some sample entries)
  const demoWorkLogs = [
    {
      id: 'log-1',
      employeeId: 'demo-1',
      employeeName: 'Demo Employee',
      jobType: 'rod',
      partName: 'Steel Rod A',
      partSize: '15mm',
      totalParts: 25,
      rejection: 1,
      date: new Date().toISOString().split('T')[0], // Today
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      offline: false
    },
    {
      id: 'log-2',
      employeeId: 'demo-1',
      employeeName: 'Demo Employee',
      jobType: 'sleeve',
      code: 'SLV-001',
      partSize: 'Medium',
      totalParts: 15,
      rejection: 0,
      date: new Date().toISOString().split('T')[0], // Today
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
      offline: false
    },
    {
      id: 'log-3',
      employeeId: 'demo-1',
      employeeName: 'Demo Employee',
      jobType: 'pin',
      partName: 'Standard Pin',
      partSize: '5mm',
      totalParts: 40,
      rejection: 2,
      date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Yesterday
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      offline: false
    }
  ];

  // Initialize localStorage with demo data if not already present
  if (!localStorage.getItem('users')) {
    localStorage.setItem('users', JSON.stringify(demoUsers));
  }

  if (!localStorage.getItem('products')) {
    localStorage.setItem('products', JSON.stringify(demoProducts));
  }

  if (!localStorage.getItem('workLogs')) {
    localStorage.setItem('workLogs', JSON.stringify(demoWorkLogs));
    // Add some additional historical data for the demo employee
    addDemoWorkLogs('demo-1', 'Demo Employee');
  }

  console.log('✅ Demo data initialized');
};

// Helper to add more demo work logs for different dates
export const addDemoWorkLogs = (employeeId: string, employeeName: string) => {
  const existingLogs = JSON.parse(localStorage.getItem('workLogs') || '[]');
  const today = new Date();
  
  const additionalLogs: any[] = [];
  
  // Add some historical data for the past week
  for (let i = 1; i <= 7; i++) {
    const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
    const dateString = date.toISOString().split('T')[0];
    
    // Add 1-3 random entries per day
    const entriesPerDay = Math.floor(Math.random() * 3) + 1;
    
    for (let j = 0; j < entriesPerDay; j++) {
      const jobTypes = ['rod', 'sleeve', 'pin'];
      const jobType = jobTypes[Math.floor(Math.random() * jobTypes.length)];
      
      let partInfo = {};
      if (jobType === 'rod') {
        const parts = ['Steel Rod A', 'Aluminum Rod B', 'Brass Rod C'];
        const sizes = ['10mm', '15mm', '20mm', '25mm'];
        partInfo = {
          partName: parts[Math.floor(Math.random() * parts.length)],
          partSize: sizes[Math.floor(Math.random() * sizes.length)]
        };
      } else if (jobType === 'sleeve') {
        const codes = ['SLV-001', 'SLV-002', 'SLV-003'];
        const sizes = ['Small', 'Medium', 'Large'];
        partInfo = {
          code: codes[Math.floor(Math.random() * codes.length)],
          partSize: sizes[Math.floor(Math.random() * sizes.length)]
        };
      } else {
        const parts = ['Standard Pin', 'Heavy Duty Pin', 'Precision Pin'];
        const sizes = ['3mm', '5mm', '8mm'];
        partInfo = {
          partName: parts[Math.floor(Math.random() * parts.length)],
          partSize: sizes[Math.floor(Math.random() * sizes.length)]
        };
      }
      
      additionalLogs.push({
        id: `log-${Date.now()}-${i}-${j}`,
        employeeId,
        employeeName,
        jobType,
        ...partInfo,
        totalParts: Math.floor(Math.random() * 50) + 10, // 10-60 parts
        rejection: Math.random() > 0.7 ? Math.floor(Math.random() * 5) : 0,
        date: dateString,
        timestamp: new Date(date.getTime() + j * 60 * 60 * 1000).toISOString(), // Spread throughout the day
        offline: Math.random() > 0.8 // 20% chance of being offline entry
      });
    }
  }
  
  const updatedLogs = [...existingLogs, ...additionalLogs];
  localStorage.setItem('workLogs', JSON.stringify(updatedLogs));
  
  console.log(`✅ Added ${additionalLogs.length} demo work logs for ${employeeName}`);
};