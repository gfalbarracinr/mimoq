#!/bin/bash

echo "🧪 Probando despliegue de producción localmente con Kind..."

# Verificar que Kind esté instalado
if ! command -v kind &> /dev/null; then
    echo "❌ Kind no está instalado. Instalando..."
    curl -Lo ./kind https://kind.sigs.k8s.io/dl/v0.20.0/kind-linux-amd64
    chmod +x ./kind
    sudo mv ./kind /usr/local/bin/kind
fi

# Crear cluster Kind para testing usando tu configuración existente
echo "🚀 Creando cluster Kind para testing..."
kind create cluster --name mimoq-prod-local --config kind.yaml

# Configurar kubectl para usar el cluster Kind
kind get kubeconfig --name mimoq-prod-local > ~/.kube/config-kind-mimoq-prod-local
export KUBECONFIG=~/.kube/config-kind-mimoq-prod-local

# Verificar conexión
kubectl cluster-info

# Setup K6 operator
echo "📦 Instalando K6 operator..."
make setup-k6-operator

# Setup monitoring (Prometheus + Grafana)
echo "📊 Instalando monitoring stack..."
# Instalar Prometheus Operator usando Helm (más ligero)
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
helm install prometheus-operator prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --set prometheus.prometheusSpec.serviceMonitorSelectorNilUsesHelmValues=false \
  --set prometheus.prometheusSpec.podMonitorSelectorNilUsesHelmValues=false \
  --set prometheus.prometheusSpec.ruleSelectorNilUsesHelmValues=false
# Esperar a que el operador esté listo
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=prometheus-operator --timeout=300s -n monitoring
# Instalar configuraciones específicas del proyecto (si existen)
if [ -f "apps/server/k8s/kustomize/base/values-monitoring.yml" ]; then
    echo "📊 Aplicando configuraciones específicas de monitoring..."
    helm upgrade monitoring prometheus-community/kube-prometheus-stack \
      --namespace monitoring \
      -f apps/server/k8s/kustomize/base/values-monitoring.yml
else
    echo "ℹ️ No se encontraron configuraciones específicas de monitoring"
fi

# Aplicar configuración de producción (usando namespace default)
echo "📦 Desplegando configuración de producción..."
kubectl apply -k apps/server/k8s/kustomize/overlays/production/
kubectl apply -k apps/webapp/k8s/kustomize/overlays/production/

# Esperar a que los pods estén listos
echo "⏳ Esperando a que los pods estén listos..."
kubectl wait --for=condition=ready pod -l app=server --timeout=300s
kubectl wait --for=condition=ready pod -l app=webapp --timeout=300s

# Mostrar estado
echo "📊 Estado de los recursos:"
kubectl get all

# Port-forward para testing
echo "🌐 Configurando port-forward para testing..."
echo "   - Server: http://localhost:3000"
echo "   - Webapp: http://localhost:4200"
echo ""
echo "💡 Para probar:"
echo "   - Abre http://localhost:4200 en tu navegador"
echo "   - Verifica que la API responda en http://localhost:3000"
echo ""
echo "🛑 Para limpiar: kind delete cluster --name mimoq-prod-local && rm ~/.kube/config-kind-mimoq-prod-local"

# Port-forward en background
kubectl port-forward service/server 3000:3000 &
kubectl port-forward service/webapp 4200:80 &

echo "✅ Cluster de testing listo! Presiona Ctrl+C para detener port-forward y limpiar."
