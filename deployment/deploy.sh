#!/bin/bash

# NBA Draft Simulator - Quick Deploy Script
# This script helps you quickly deploy the app to various platforms

set -e  # Exit on error

echo "🏀 NBA Draft Simulator - Quick Deploy Helper"
echo "=============================================="
echo ""

# Check if git is initialized
if [ ! -d .git ]; then
    echo "📦 Initializing git repository..."
    git init
    git add .
    git commit -m "Initial commit - NBA Draft Simulator"
    echo "✅ Git repository initialized"
    echo ""
fi

# Function to deploy to Vercel
deploy_to_vercel() {
    echo "🚀 Deploying to Vercel..."
    echo ""
    echo "Please follow these steps:"
    echo "1. Go to https://vercel.com"
    echo "2. Click 'New Project' and import your GitHub repo"
    echo "3. Configure:"
    echo "   - Framework: Vite"
    echo "   - Root Directory: client"
    echo "   - Build Command: cd ../shared && npm install && npm run build && cd ../client && npm install && npm run build"
    echo "   - Output Directory: client/dist"
    echo "4. Set Environment Variable: VITE_SERVER_URL (backend URL)"
    echo "5. Deploy!"
    echo ""
    read -p "Press Enter when done..."
}

# Function to deploy to Railway
deploy_to_railway() {
    echo "🚂 Deploying to Railway..."
    echo ""
    echo "Please follow these steps:"
    echo "1. Go to https://railway.app"
    echo "2. Click 'New Project' → 'Deploy from GitHub repo'"
    echo "3. Select your repository"
    echo "4. Railway will auto-detect the configuration"
    echo "5. Set Environment Variables:"
    echo "   - NODE_ENV=production"
    echo "   - PORT=3001"
    echo "   - CLIENT_URL=<your-vercel-url>"
    echo "   - SESSION_SECRET=<generate-random-string>"
    echo "6. Click 'Deploy'"
    echo "7. Get the public URL from Settings → Networking"
    echo ""
    read -p "Press Enter when done..."
}

# Function to generate session secret
generate_secret() {
    echo "🔐 Generating secure SESSION_SECRET..."
    SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    echo ""
    echo "Your SESSION_SECRET (save this!):"
    echo "$SECRET"
    echo ""
    echo "Add this to your backend environment variables"
    echo ""
}

# Main menu
echo "Choose your deployment option:"
echo "1) Deploy Frontend to Vercel"
echo "2) Deploy Backend to Railway"
echo "3) Generate SESSION_SECRET"
echo "4) Deploy with Docker Compose (local/VPS)"
echo "5) View full deployment guide"
echo "6) Exit"
echo ""

read -p "Enter your choice (1-6): " choice

case $choice in
    1)
        deploy_to_vercel
        ;;
    2)
        deploy_to_railway
        ;;
    3)
        generate_secret
        ;;
    4)
        echo "🐳 Deploying with Docker Compose..."
        echo ""
        echo "Make sure Docker is installed, then run:"
        echo "  docker-compose up -d --build"
        echo ""
        echo "Your app will be available at:"
        echo "  Frontend: http://localhost:3000"
        echo "  Backend:  http://localhost:3001"
        echo ""
        read -p "Do you want to run this now? (y/n): " run_docker
        if [ "$run_docker" = "y" ]; then
            docker-compose up -d --build
            echo "✅ App is running!"
            echo "View logs with: docker-compose logs -f"
        fi
        ;;
    5)
        echo "📖 Opening deployment guide..."
        if command -v less &> /dev/null; then
            less DEPLOYMENT.md
        else
            cat DEPLOYMENT.md
        fi
        ;;
    6)
        echo "👋 Goodbye!"
        exit 0
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "✨ Done! Need help? Check DEPLOYMENT.md for detailed guides"
echo ""
