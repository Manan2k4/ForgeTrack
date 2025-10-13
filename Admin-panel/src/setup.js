#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Employee Management System Setup');
console.log('=====================================\n');

// Check if Node.js version is compatible
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.substring(1).split('.')[0]);

if (majorVersion < 16) {
  console.error('❌ Node.js version 16 or higher is required.');
  console.error(`   Current version: ${nodeVersion}`);
  console.error('   Please upgrade Node.js and try again.');
  process.exit(1);
}

console.log('✅ Node.js version compatible:', nodeVersion);

// Function to run command and handle errors
function runCommand(command, description) {
  console.log(`📦 ${description}...`);
  try {
    execSync(command, { stdio: 'inherit' });
    console.log(`✅ ${description} completed\n`);
  } catch (error) {
    console.error(`❌ ${description} failed`);
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Create .env files if they don't exist
function createEnvFiles() {
  console.log('📁 Setting up environment files...');
  
  // Frontend .env
  const frontendEnvPath = '.env';
  if (!fs.existsSync(frontendEnvPath)) {
    const frontendEnvContent = `REACT_APP_API_URL=http://localhost:5000/api\n`;
    fs.writeFileSync(frontendEnvPath, frontendEnvContent);
    console.log('✅ Created frontend .env file');
  } else {
    console.log('ℹ️  Frontend .env file already exists');
  }

  // Backend .env
  const backendEnvPath = path.join('backend', '.env');
  const backendEnvExamplePath = path.join('backend', '.env.example');
  
  if (!fs.existsSync(backendEnvPath) && fs.existsSync(backendEnvExamplePath)) {
    fs.copyFileSync(backendEnvExamplePath, backendEnvPath);
    console.log('✅ Created backend .env file from template');
    console.log('⚠️  Please update the MongoDB URI and JWT secret in backend/.env');
  } else if (fs.existsSync(backendEnvPath)) {
    console.log('ℹ️  Backend .env file already exists');
  }
  
  console.log('');
}

// Main setup process
async function setup() {
  try {
    // Install frontend dependencies
    runCommand('npm install', 'Installing frontend dependencies');

    // Install backend dependencies
    runCommand('npm install --prefix backend', 'Installing backend dependencies');

    // Create environment files
    createEnvFiles();

    console.log('🎉 Setup completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Update your MongoDB Atlas URI in backend/.env');
    console.log('2. Start the backend: cd backend && npm run dev');
    console.log('3. Start the frontend: npm start');
    console.log('\n📖 For detailed instructions, see SETUP_INSTRUCTIONS.md');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

// Run setup
setup();