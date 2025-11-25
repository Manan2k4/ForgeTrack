const express = require('express');
const WorkLog = require('../models/WorkLog');
const JobType = require('../models/JobType');
const User = require('../models/User');
const { adminAuth } = require('../middleware/auth');
const router = express.Router();

// Get employee salary breakdown for a specific month
router.get('/employee/:employeeId', adminAuth, async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { month, year } = req.query;

    console.log('Salary request - employeeId:', employeeId, 'month:', month, 'year:', year);

    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: 'Month and year are required'
      });
    }

    const monthNum = parseInt(month);
    const yearNum = parseInt(year);

    if (isNaN(monthNum) || isNaN(yearNum) || monthNum < 1 || monthNum > 12) {
      return res.status(400).json({
        success: false,
        message: 'Invalid month or year'
      });
    }

    // Validate ObjectId format
    if (!employeeId || !/^[0-9a-fA-F]{24}$/.test(employeeId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid employee ID format'
      });
    }

    // Verify employee exists
    const employee = await User.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Get all work logs for this employee in the specified month
    const startDate = `${yearNum}-${String(monthNum).padStart(2, '0')}-01`;
    const endDate = `${yearNum}-${String(monthNum).padStart(2, '0')}-${new Date(yearNum, monthNum, 0).getDate()}`;

    console.log('Fetching work logs:', { employeeId, startDate, endDate });

    const workLogs = await WorkLog.find({
      employee: employeeId,
      workDate: { $gte: startDate, $lte: endDate }
    }).populate('product', 'type code partName').sort({ workDate: 1 });

    console.log(`Found ${workLogs.length} work logs`);

    // Fetch all job types with rates
    const jobTypes = await JobType.find({});
    console.log(`Found ${jobTypes.length} job types with rates`);
    const jobTypeMap = {};
    jobTypes.forEach(jt => {
      const key = `${jt.partType}:${jt.jobName}`;
      jobTypeMap[key] = jt.rate || 0;
    });

    // Group logs by date and calculate amounts
    const dailyLogsMap = {};
    
    for (const log of workLogs) {
      const date = log.workDate;
      if (!dailyLogsMap[date]) {
        dailyLogsMap[date] = [];
      }

      const partType = log.jobType; // 'rod', 'sleeve', 'pin'
      const jobName = log.operation || 'Standard'; // Use operation as job name if available
      const key = `${partType}:${jobName}`;
      const rate = jobTypeMap[key] || 0;
      
      const okParts = (log.totalParts || log.quantity || 0) - (log.rejection || 0);
      const amount = okParts * rate;

      dailyLogsMap[date].push({
        jobName,
        partType,
        totalParts: log.totalParts || log.quantity || 0,
        rejection: log.rejection || 0,
        okParts,
        rate,
        amount,
        code: log.product?.code || '',
        partName: log.product?.partName || ''
      });
    }

    // Convert to array format with daily totals
    const dailyLogs = Object.keys(dailyLogsMap).sort().map(date => {
      const logs = dailyLogsMap[date];
      const dayTotal = logs.reduce((sum, log) => sum + log.amount, 0);
      return {
        date,
        logs,
        dayTotal
      };
    });

    const monthTotal = dailyLogs.reduce((sum, day) => sum + day.dayTotal, 0);

    res.json({
      success: true,
      data: {
        employeeId,
        employeeName: employee.name,
        month: monthNum,
        year: yearNum,
        dailyLogs,
        monthTotal
      }
    });
  } catch (error) {
    console.error('Get employee salary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate employee salary',
      error: error.message
    });
  }
});

module.exports = router;
