#!/bin/bash

# AlgoRizz Deploy Script
# Usage: ./deploy.sh "your commit message here"

set -e

COMMIT_MSG="${1:-Update code}"

echo "🚀 Deploying AlgoRizz..."
echo ""

# Step 1: Build locally
echo "📦 Building production bundle..."
npm run build

# Step 2: Git operations
echo ""
echo "📝 Committing changes..."
git add -A
git commit -m "$COMMIT_MSG" || echo "No changes to commit"

# Step 3: Push to GitHub
echo "📤 Pushing to GitHub..."
git push origin main

# Step 4: Deploy to Vercel
echo ""
echo "🌐 Deploying to Vercel..."
if command -v vercel &> /dev/null; then
  vercel deploy --prod
else
  echo "⚠️  Vercel CLI not installed. Install with: npm install -g vercel"
  echo "✅ Code pushed to GitHub. Vercel will auto-deploy via GitHub integration."
fi

echo ""
echo "✨ Done! Your changes are live at https://algo-rizz-frontend-clean-p2.vercel.app/"
