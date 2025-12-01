const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxLength: [100, 'Name cannot exceed 100 characters']
  },
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minLength: [3, 'Username must be at least 3 characters'],
    maxLength: [30, 'Username cannot exceed 30 characters']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minLength: [6, 'Password must be at least 6 characters']
  },
  // Encrypted snapshot of the last set plaintext password (AES-256-GCM)
  passwordEnc: {
    type: String,
    select: false
  },
  // When true, require user to change password on next login (optional future use)
  forceChangePassword: {
    type: Boolean,
    default: false
  },
  role: {
    type: String,
    enum: ['admin', 'employee'],
    default: 'employee'
  },
  contact: {
    type: String,
    required: function() {
      return this.role === 'employee';
    },
    trim: true
  },
  address: {
    type: String,
    required: function() {
      return this.role === 'employee';
    },
    trim: true
  },
  department: {
    type: String,
    required: function() {
      return this.role === 'employee';
    },
    enum: ['Sleeve Workshop', 'Rod/Pin Workshop', 'Packing', 'Transporter']
  },
  // Employment classification for salary calculations
  employmentType: {
    type: String,
    enum: ['Contract', 'Monthly', 'Daily Roj'],
    default: 'Contract'
  },
  // Monetary fields (optional, only meaningful for Monthly / Daily Roj types)
  salaryPerDay: {
    type: Number,
    min: [0, 'salaryPerDay cannot be negative'],
  },
  dailyRojRate: {
    type: Number,
    min: [0, 'dailyRojRate cannot be negative'],
  },
  // Soft-delete flag to retain historical work logs after deactivation
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    // Capture plaintext before hashing and encrypt it
    const key = (process.env.PASSWORD_ENC_KEY || '').trim();
    if (!key || key.length < 32) {
      // Warn in logs; still proceed hashing so user can login
      console.warn('[UserModel] PASSWORD_ENC_KEY missing/short; admin password reveal will not work.');
      this.passwordEnc = undefined;
    } else {
      try {
        const encKey = Buffer.from(key).slice(0,32); // ensure 32 bytes
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv('aes-256-gcm', encKey, iv);
        let encrypted = cipher.update(this.password, 'utf8', 'base64');
        encrypted += cipher.final('base64');
        const tag = cipher.getAuthTag();
        this.passwordEnc = `${iv.toString('base64')}.${tag.toString('base64')}.${encrypted}`;
      } catch (e) {
        console.error('[UserModel] Failed to encrypt password snapshot:', e.message);
        this.passwordEnc = undefined;
      }
    }
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output
userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.passwordEnc;
  return userObject;
};

// Decrypt the stored password snapshot (admin usage)
userSchema.methods.getPlainPassword = function() {
  if (!this.passwordEnc) return null;
  try {
    const key = (process.env.PASSWORD_ENC_KEY || '').trim();
    if (!key || key.length < 32) return null;
    const encKey = Buffer.from(key).slice(0,32);
    const [ivB64, tagB64, dataB64] = this.passwordEnc.split('.');
    if (!ivB64 || !tagB64 || !dataB64) return null;
    const iv = Buffer.from(ivB64, 'base64');
    const tag = Buffer.from(tagB64, 'base64');
    const decipher = crypto.createDecipheriv('aes-256-gcm', encKey, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(dataB64, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (e) {
    console.error('[UserModel] Decryption failed:', e.message);
    return null;
  }
};

module.exports = mongoose.model('User', userSchema);