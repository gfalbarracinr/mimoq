#!/bin/bash

echo "🚀 Desplegando MimoQ Webapp en producción..."

# Verificar conexión al cluster
kubectl cluster-info

# Preview de la configuración
echo "🔍 Preview de la configuración de la webapp:"
kubectl kustomize k8s/kustomize/overlays/production/ | head -20
echo "..."

# Aplicar con Kustomize
echo "📦 Aplicando configuración de producción de la webapp..."
kubectl apply -k k8s/kustomize/overlays/production/

echo "✅ Deployment de la webapp completado!"
echo "📊 Estado de los recursos de la webapp:"
kubectl get all -n mimoq-prod -l app.kubernetes.io/name=mimoq-webapp

echo ""
echo "🌐 Para acceder a la webapp:"
echo "   - Port-forward: kubectl port-forward service/webapp -n mimoq-prod 4200:4200"
echo "   - O via Ingress si está configurado"
