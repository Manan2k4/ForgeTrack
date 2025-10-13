const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  type: {
    type: String,
    required: [true, 'Product type is required'],
    enum: ['sleeve', 'rod', 'pin']
  },
  code: {
    type: String,
    required: function() {
      return this.type === 'sleeve';
    },
    trim: true,
    // Uniqueness is enforced via schema.index below for sleeves
  },
  partName: {
    type: String,
    required: function() {
      return this.type === 'rod' || this.type === 'pin';
    },
    trim: true
  },
  sizes: [{
    type: String,
    required: true,
    trim: true
  }]
}, {
  timestamps: true
});

// Create compound unique index for partName + type (case-insensitive)
productSchema.index({ partName: 1, type: 1 }, { 
  unique: true,
  partialFilterExpression: { 
    type: { $in: ['rod', 'pin'] },
    partName: { $exists: true }
  },
  collation: { locale: 'en', strength: 2 }
});

// Create unique index for code when type is sleeve
productSchema.index({ code: 1 }, { 
  unique: true,
  partialFilterExpression: { 
    type: 'sleeve',
    code: { $exists: true }
  }
});

module.exports = mongoose.model('Product', productSchema);