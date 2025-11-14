#!/bin/bash

echo "🔍 Verificando instalación de Chaos Mesh..."
echo ""

echo "1️⃣ Verificando namespace chaos-mesh:"
kubectl get namespace chaos-mesh
echo ""

echo "2️⃣ Verificando CRDs de Chaos Mesh:"
kubectl get crd | grep chaos-mesh
echo ""

echo "3️⃣ Verificando CRDs específicos:"
echo "   - podfailurechaos.chaos-mesh.org:"
kubectl get crd podfailurechaos.chaos-mesh.org 2>/dev/null && echo "   ✅ Instalado" || echo "   ❌ No encontrado"
echo "   - podchaos.chaos-mesh.org:"
kubectl get crd podchaos.chaos-mesh.org 2>/dev/null && echo "   ✅ Instalado" || echo "   ❌ No encontrado"
echo "   - networkchaos.chaos-mesh.org:"
kubectl get crd networkchaos.chaos-mesh.org 2>/dev/null && echo "   ✅ Instalado" || echo "   ❌ No encontrado"
echo "   - stresschaos.chaos-mesh.org:"
kubectl get crd stresschaos.chaos-mesh.org 2>/dev/null && echo "   ✅ Instalado" || echo "   ❌ No encontrado"
echo ""

echo "4️⃣ Verificando pods de Chaos Mesh:"
kubectl get pods -n chaos-mesh
echo ""

echo "5️⃣ Probando acceso a la API de Chaos Mesh:"
echo "   - Listando podfailurechaos (debería funcionar incluso si está vacío):"
kubectl get podfailurechaos --all-namespaces 2>&1 | head -5
echo "   - Listando podchaos:"
kubectl get podchaos --all-namespaces 2>&1 | head -5
echo "   - Listando networkchaos:"
kubectl get networkchaos --all-namespaces 2>&1 | head -5
echo "   - Listando stresschaos:"
kubectl get stresschaos --all-namespaces 2>&1 | head -5
echo ""

echo "6️⃣ Verificando permisos RBAC:"
kubectl get clusterrole nest-deployer-role -o yaml | grep -A 10 "chaos-mesh"
echo ""

echo "7️⃣ Verificando ServiceAccount:"
kubectl get serviceaccount nest-deployer -n default 2>/dev/null && echo "   ✅ ServiceAccount existe" || echo "   ❌ ServiceAccount no encontrado"
echo ""

echo "✅ Verificación completada"
