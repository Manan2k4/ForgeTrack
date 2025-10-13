// Sets admin username and password from env (creates admin if missing)
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set in backend/.env');
    process.exit(1);
  }

  const USERNAME = process.env.ADMIN_USERNAME;
  const PASSWORD = process.env.ADMIN_PASSWORD;
  if (!USERNAME || !PASSWORD) {
    console.error('ADMIN_USERNAME and ADMIN_PASSWORD must be set in the environment for this script.');
    process.exit(1);
  }
  await mongoose.connect(uri);
  try {
    let admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      admin = new User({ name: 'Administrator', username: USERNAME, password: PASSWORD, role: 'admin' });
      await admin.save();
      console.log(`✅ Created admin with username/password: ${USERNAME}`);
    } else {
      admin.username = USERNAME;
      admin.password = PASSWORD; // pre-save hook will hash
      await admin.save();
      console.log(`✅ Updated admin credentials to username/password: ${USERNAME}`);
    }
  } catch (e) {
    console.error('❌ Failed to set admin credentials:', e);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

run();
