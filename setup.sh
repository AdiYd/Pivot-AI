#!/bin/bash

# WhatsApp Inventory Bot Setup Script

echo "🚀 Setting up WhatsApp Inventory Bot..."

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Set up schema package
echo "🔄 Setting up schema package..."
cd packages/schema
npm install
cd ../..

# Set up botEngine package
echo "🤖 Setting up botEngine package..."
cd packages/botEngine
npm install
cd ../..

# Set up Firebase Functions
echo "🔥 Setting up Firebase Functions..."
cd functions
npm install
cd ..

# Set up Next.js admin panel
echo "🖥️ Setting up Next.js admin panel..."
cd apps/web-admin
npm install
cd ../..

echo "✅ Setup complete! You can now start development:"
echo "  • Admin panel: npm run dev"
echo "  • Functions local emulator: cd functions && npm run serve"
echo "  • Build all packages: npm run build"
