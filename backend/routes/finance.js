const express = require('express');
const { adminAuth } = require('../middleware/auth');
const UpadEntry = require('../models/UpadEntry');
const Loan = require('../models/Loan');
const LoanTransaction = require('../models/LoanTransaction');

const router = express.Router();

// Create Upad entry
router.post('/upad', adminAuth, async (req, res) => {
  try {
    const { employeeId, month, year, amount, note } = req.body;
    if (!employeeId || !month || !year || typeof amount !== 'number') {
      return res.status(400).json({ success: false, message: 'employeeId, month, year and amount are required' });
    }

    const entry = await UpadEntry.create({
      employee: employeeId,
      month,
      year,
      amount,
      note: note || undefined,
    });

    return res.status(201).json({ success: true, data: entry });
  } catch (error) {
    console.error('Create Upad error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create Upad entry', error: error.message });
  }
});

// List Upad entries (optionally filtered by employee/month/year)
router.get('/upad', adminAuth, async (req, res) => {
  try {
    const { employeeId, month, year } = req.query;
    const filter = {};
    if (employeeId) filter.employee = employeeId;
    if (month) filter.month = Number(month);
    if (year) filter.year = Number(year);

    const entries = await UpadEntry.find(filter)
      .populate('employee', 'name department')
      .sort({ year: -1, month: -1, createdAt: -1 });

    return res.json({ success: true, data: entries });
  } catch (error) {
    console.error('List Upad error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch Upad entries', error: error.message });
  }
});

// Update a single Upad entry
router.put('/upad/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { month, year, amount, note } = req.body;

    const update = {};
    if (month) update.month = month;
    if (year) update.year = year;
    if (typeof amount === 'number') update.amount = amount;
    if (note !== undefined) update.note = note;

    const entry = await UpadEntry.findByIdAndUpdate(id, update, { new: true });
    if (!entry) {
      return res.status(404).json({ success: false, message: 'Upad entry not found' });
    }

    return res.json({ success: true, data: entry });
  } catch (error) {
    console.error('Update Upad error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update Upad entry', error: error.message });
  }
});

// Delete a single Upad entry
router.delete('/upad/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const entry = await UpadEntry.findByIdAndDelete(id);
    if (!entry) {
      return res.status(404).json({ success: false, message: 'Upad entry not found' });
    }

    return res.json({ success: true, message: 'Upad entry deleted' });
  } catch (error) {
    console.error('Delete Upad error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete Upad entry', error: error.message });
  }
});

// Create Loan
router.post('/loans', adminAuth, async (req, res) => {
  try {
    const { employeeId, startMonth, startYear, principal, defaultInstallment, note } = req.body;
    if (!employeeId || !startMonth || !startYear || typeof principal !== 'number' || typeof defaultInstallment !== 'number') {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const loan = await Loan.create({
      employee: employeeId,
      startMonth,
      startYear,
      principal,
      defaultInstallment,
      note: note || undefined,
    });

    return res.status(201).json({ success: true, data: loan });
  } catch (error) {
    console.error('Create Loan error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create loan', error: error.message });
  }
});

// List Loans for an employee
router.get('/loans', adminAuth, async (req, res) => {
  try {
    const { employeeId, status } = req.query;
    const filter = {};
    if (employeeId) filter.employee = employeeId;
    if (status) filter.status = status;

    const loans = await Loan.find(filter)
      .populate('employee', 'name department')
      .sort({ createdAt: -1 });

    return res.json({ success: true, data: loans });
  } catch (error) {
    console.error('List Loans error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch loans', error: error.message });
  }
});

// Update a Loan (e.g. note, status, principal/installment corrections)
router.put('/loans/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { principal, defaultInstallment, note, status } = req.body;

    const update = {};
    if (typeof principal === 'number') update.principal = principal;
    if (typeof defaultInstallment === 'number') update.defaultInstallment = defaultInstallment;
    if (note !== undefined) update.note = note;
    if (status) update.status = status;

    const loan = await Loan.findByIdAndUpdate(id, update, { new: true });
    if (!loan) {
      return res.status(404).json({ success: false, message: 'Loan not found' });
    }

    return res.json({ success: true, data: loan });
  } catch (error) {
    console.error('Update Loan error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update loan', error: error.message });
  }
});

// Delete a Loan (does not delete its transactions)
router.delete('/loans/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const loan = await Loan.findByIdAndDelete(id);
    if (!loan) {
      return res.status(404).json({ success: false, message: 'Loan not found' });
    }

    return res.json({ success: true, message: 'Loan deleted' });
  } catch (error) {
    console.error('Delete Loan error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete loan', error: error.message });
  }
});

// Create Loan transaction (installment/payment)
router.post('/loans/:loanId/transactions', adminAuth, async (req, res) => {
  try {
    const { loanId } = req.params;
    const { month, year, amount, mode } = req.body;
    if (!month || !year || typeof amount !== 'number') {
      return res.status(400).json({ success: false, message: 'month, year and amount are required' });
    }

    const loan = await Loan.findById(loanId);
    if (!loan) {
      return res.status(404).json({ success: false, message: 'Loan not found' });
    }

    const tx = await LoanTransaction.create({
      loan: loanId,
      employee: loan.employee,
      month,
      year,
      amount,
      mode: mode || 'salary-deduction',
    });

    // Auto-close loan when fully paid
    try {
      const allTxForLoan = await LoanTransaction.find({ loan: loanId });
      const totalPaid = allTxForLoan.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
      const principal = Number(loan.principal) || 0;
      const tolerance = 0.01; // handle rounding errors
      if (principal > 0 && totalPaid >= principal - tolerance && loan.status !== 'closed') {
        loan.status = 'closed';
        await loan.save();
      }
    } catch (closeError) {
      console.error('Auto-close loan error:', closeError);
      // continue without failing the transaction creation
    }

    return res.status(201).json({ success: true, data: tx });
  } catch (error) {
    console.error('Create Loan transaction error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create loan transaction', error: error.message });
  }
});

// List transactions for a loan
router.get('/loans/:loanId/transactions', adminAuth, async (req, res) => {
  try {
    const { loanId } = req.params;
    if (!loanId) {
      return res.status(400).json({ success: false, message: 'loanId is required' });
    }

    const transactions = await LoanTransaction.find({ loan: loanId })
      .sort({ year: -1, month: -1, createdAt: -1 });

    return res.json({ success: true, data: transactions });
  } catch (error) {
    console.error('List Loan transactions error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch loan transactions', error: error.message });
  }
});

// Update a loan transaction
router.put('/loans/transactions/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { month, year, amount, mode } = req.body;

    const update = {};
    if (month) update.month = Number(month);
    if (year) update.year = Number(year);
    if (typeof amount === 'number') update.amount = Number(amount);
    if (mode) update.mode = mode;

    const tx = await LoanTransaction.findByIdAndUpdate(id, update, { new: true });
    if (!tx) return res.status(404).json({ success: false, message: 'Transaction not found' });

    // Recalculate loan status after update
    const loan = await Loan.findById(tx.loan);
    if (loan) {
      const allTxForLoan = await LoanTransaction.find({ loan: loan._id });
      const totalPaid = allTxForLoan.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
      const principal = Number(loan.principal) || 0;
      const tolerance = 0.01;
      if (principal > 0 && totalPaid >= principal - tolerance) {
        if (loan.status !== 'closed') {
          loan.status = 'closed';
          await loan.save();
        }
      } else {
        if (loan.status === 'closed') {
          loan.status = 'active';
          await loan.save();
        }
      }
    }

    return res.json({ success: true, data: tx });
  } catch (error) {
    console.error('Update Loan transaction error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update loan transaction', error: error.message });
  }
});

// Delete a loan transaction
router.delete('/loans/transactions/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const tx = await LoanTransaction.findByIdAndDelete(id);
    if (!tx) return res.status(404).json({ success: false, message: 'Transaction not found' });

    // Recalculate loan status after deletion
    const loan = await Loan.findById(tx.loan);
    if (loan) {
      const allTxForLoan = await LoanTransaction.find({ loan: loan._id });
      const totalPaid = allTxForLoan.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
      const principal = Number(loan.principal) || 0;
      const tolerance = 0.01;
      if (principal > 0 && totalPaid >= principal - tolerance) {
        if (loan.status !== 'closed') {
          loan.status = 'closed';
          await loan.save();
        }
      } else {
        if (loan.status === 'closed') {
          loan.status = 'active';
          await loan.save();
        }
      }
    }

    return res.json({ success: true, message: 'Transaction deleted' });
  } catch (error) {
    console.error('Delete Loan transaction error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete loan transaction', error: error.message });
  }
});

// Loan summary for an employee and month
router.get('/loans/:employeeId/summary', adminAuth, async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { month, year } = req.query;
    if (!month || !year) {
      return res.status(400).json({ success: false, message: 'month and year are required' });
    }
    const m = Number(month);
    const y = Number(year);

    const loans = await Loan.find({ employee: employeeId, status: 'active' }).sort({ createdAt: 1 });
    const loanIds = loans.map(l => l._id);

    const allTx = await LoanTransaction.find({ loan: { $in: loanIds } });

    let pendingTotal = 0;
    let installmentForMonth = 0;

    loans.forEach(loan => {
      const txForLoan = allTx.filter(t => String(t.loan) === String(loan._id));
      const paidTotal = txForLoan.reduce((sum, t) => sum + t.amount, 0);
      const pending = Math.max(0, loan.principal - paidTotal);
      pendingTotal += pending;
    });

    installmentForMonth = allTx
      .filter(t => t.month === m && t.year === y)
      .reduce((sum, t) => sum + t.amount, 0);

    return res.json({ success: true, data: { pendingTotal, installmentForMonth } });
  } catch (error) {
    console.error('Loan summary error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch loan summary', error: error.message });
  }
});

// Aggregated loan data for an employee (loans + transactions + per-loan stats)
router.get('/loans/:employeeId/data', adminAuth, async (req, res) => {
  try {
    const { employeeId } = req.params;
    if (!employeeId) return res.status(400).json({ success: false, message: 'employeeId required' });

    // fetch all loans (any status) for the employee
    const loans = await Loan.find({ employee: employeeId }).sort({ createdAt: -1 });
    const loanIds = loans.map((l) => l._id);

    // fetch all transactions for these loans
    const transactions = await LoanTransaction.find({ loan: { $in: loanIds } })
      .sort({ year: -1, month: -1, createdAt: -1 })
      .lean();

    // build per-loan stats
    const stats = {};
    loans.forEach((loan) => {
      stats[loan._id] = { paidTotal: 0, pendingAmount: Number(loan.principal || 0) };
    });
    transactions.forEach((tx) => {
      const lid = String(tx.loan);
      if (!stats[lid]) stats[lid] = { paidTotal: 0, pendingAmount: 0 };
      stats[lid].paidTotal += Number(tx.amount || 0);
      stats[lid].pendingAmount = Math.max(0, (Number(loans.find((l) => String(l._id) === lid)?.principal || 0) - stats[lid].paidTotal));
    });

    return res.json({ success: true, data: { loans, transactions, stats } });
  } catch (error) {
    console.error('Loan aggregated data error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch loan aggregated data', error: error.message });
  }
});

// Apply missing EMIs up to a target month/year for an employee
// Creates salary-deduction transactions using each loan's defaultInstallment,
// starting from loan.startMonth/startYear up to the provided month/year,
// skipping months that already have a transaction for that loan.
router.post('/loans/:employeeId/apply-missing-emis', adminAuth, async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { month, year } = req.body;
    if (!employeeId || !month || !year) {
      return res.status(400).json({ success: false, message: 'employeeId, month and year are required' });
    }
    const targetMonth = Number(month);
    const targetYear = Number(year);

    const loans = await Loan.find({ employee: employeeId, status: { $in: ['active', 'closed'] } }).sort({ createdAt: 1 }).lean();
    if (loans.length === 0) {
      return res.json({ success: true, data: { created: 0, details: [] } });
    }

    const createdDetails = [];

    for (const loan of loans) {
      const startM = Number(loan.startMonth);
      const startY = Number(loan.startYear);
      const defaultAmt = Number(loan.defaultInstallment) || 0;
      if (!startM || !startY || defaultAmt <= 0) continue;

      // Fetch existing transactions for this loan
      const existing = await LoanTransaction.find({ loan: loan._id }).lean();
      const existingSet = new Set(existing.map(e => `${e.year}-${e.month}`));

      // Iterate months from start to target
      let y = startY;
      let m = startM;
      while (y < targetYear || (y === targetYear && m <= targetMonth)) {
        const key = `${y}-${m}`;
        if (!existingSet.has(key)) {
          // Create missing EMI transaction
          const tx = await LoanTransaction.create({
            loan: loan._id,
            employee: loan.employee,
            month: m,
            year: y,
            amount: defaultAmt,
            mode: 'salary-deduction',
          });
          createdDetails.push({ loanId: String(loan._id), month: m, year: y, amount: defaultAmt, transactionId: String(tx._id) });
          existingSet.add(key);
        }
        // Advance month
        m += 1;
        if (m > 12) { m = 1; y += 1; }
      }

      // Recalculate and update loan status after creation
      const allTxForLoan = await LoanTransaction.find({ loan: loan._id });
      const totalPaid = allTxForLoan.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
      const principal = Number(loan.principal) || 0;
      const tolerance = 0.01;
      const loanDoc = await Loan.findById(loan._id);
      if (loanDoc) {
        if (principal > 0 && totalPaid >= principal - tolerance) {
          if (loanDoc.status !== 'closed') {
            loanDoc.status = 'closed';
            await loanDoc.save();
          }
        } else {
          if (loanDoc.status === 'closed') {
            loanDoc.status = 'active';
            await loanDoc.save();
          }
        }
      }
    }

    return res.json({ success: true, data: { created: createdDetails.length, details: createdDetails } });
  } catch (error) {
    console.error('Apply missing EMIs error:', error);
    return res.status(500).json({ success: false, message: 'Failed to apply missing EMIs', error: error.message });
  }
});

module.exports = router;

