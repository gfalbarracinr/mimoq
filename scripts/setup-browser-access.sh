#!/bin/bash

echo "🌐 Configurando acceso desde navegador para producción..."

CLUSTER_IP=$(kubectl get nodes -o jsonpath='{.items[0].status.addresses[?(@.type=="InternalIP")].address}')

if [ -z "$CLUSTER_IP" ]; then
    echo "❌ No se pudo obtener la IP del cluster"
    exit 1
fi

echo "📍 IP del cluster: $CLUSTER_IP"

if ! kubectl get pods -n ingress-nginx 2>/dev/null | grep -q "ingress-nginx"; then
    echo "📦 Instalando NGINX Ingress Controller..."
    kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.2/deploy/static/provider/cloud/deploy.yaml
    
    echo "⏳ Esperando a que el Ingress Controller esté listo..."
    kubectl wait --namespace ingress-nginx \
      --for=condition=ready pod \
      --selector=app.kubernetes.io/component=controller \
      --timeout=300s
fi

INGRESS_IP=$(kubectl get service ingress-nginx-controller -n ingress-nginx -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

if [ -z "$INGRESS_IP" ]; then
    echo "⚠️  LoadBalancer no tiene IP externa. Usando NodePort..."
    INGRESS_IP=$CLUSTER_IP
    INGRESS_PORT=$(kubectl get service ingress-nginx-controller -n ingress-nginx -o jsonpath='{.spec.ports[0].nodePort}')
    echo "📍 Acceso: http://$INGRESS_IP:$INGRESS_PORT"
else
    echo "📍 Acceso: http://$INGRESS_IP"
fi

echo "📝 Agregando entrada a /etc/hosts..."
if ! grep -q "mimoq.local" /etc/hosts; then
    echo "$INGRESS_IP mimoq.local" | sudo tee -a /etc/hosts
    echo "✅ Entrada agregada a /etc/hosts"
else
    echo "✅ Entrada ya existe en /etc/hosts"
fi

echo ""
echo "🌐 Acceso configurado:"
echo "   - Aplicación completa: http://mimoq.local"
echo "   - API: http://mimoq.local/api"
echo ""
echo "💡 Si no funciona, verifica que:"
echo "   1. El Ingress Controller esté funcionando: kubectl get pods -n ingress-nginx"
echo "   2. Los Ingress estén creados: kubectl get ingress -n mimoq-prod"
echo "   3. La entrada en /etc/hosts sea correcta"
