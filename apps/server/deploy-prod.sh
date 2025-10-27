#!/bin/bash

echo "🚀 Desplegando MimoQ Server en producción..."

# Verificar conexión al cluster
kubectl cluster-info

# Preview de la configuración
echo "🔍 Preview de la configuración del servidor:"
kubectl kustomize k8s/kustomize/overlays/production/ | head -20
echo "..."

# Aplicar con Kustomize
echo "📦 Aplicando configuración de producción del servidor..."
kubectl apply -k k8s/kustomize/overlays/production/

echo "✅ Deployment del servidor completado!"
echo "📊 Estado de los recursos del servidor:"
kubectl get all -n mimoq-prod -l app.kubernetes.io/name=mimoq-server

echo ""
echo "🌐 Para acceder al servidor:"
echo "   - Port-forward: kubectl port-forward service/server -n mimoq-prod 3000:3000"
echo "   - O via Ingress si está configurado"
