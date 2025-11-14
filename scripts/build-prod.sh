#!/bin/bash

echo "🏗️ Building production images..."

echo "📦 Building server image..."
docker build --no-cache -f apps/server/Dockerfile.prod -t gfalbarracinr/server:latest apps/server/

echo "📦 Building webapp image..."
docker build --no-cache -f apps/webapp/Dockerfile -t gfalbarracinr/webapp:latest apps/webapp/

echo "✅ Production images built successfully!"
echo "📋 Images available:"
echo "   - gfalbarracinr/server:latest"
echo "   - gfalbarracinr/webapp:latest"
