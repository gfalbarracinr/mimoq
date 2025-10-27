#!/bin/bash

echo "🔄 Sincronizando archivos YAML de Tilt a Kustomize..."

# Sincronizar server
echo "📦 Sincronizando server..."
cp apps/server/k8s/tilt/*.yml apps/server/k8s/kustomize/base/ 2>/dev/null || true

# Sincronizar webapp
echo "📦 Sincronizando webapp..."
cp apps/webapp/k8s/tilt/*.yml apps/webapp/k8s/kustomize/base/ 2>/dev/null || true

echo "✅ Sincronización completada!"
echo "💡 Ahora puedes usar: make deploy-prod"
