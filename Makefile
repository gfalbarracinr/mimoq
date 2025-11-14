K6_OPERATOR_BUNDLE=https://raw.githubusercontent.com/grafana/k6-operator/main/bundle.yaml
K6_NAMESPACE=k6-operator-system
CHAOS_MESH_NAMESPACE=chaos-mesh

.PHONY: setup-k6-operator check-k6-operator uninstall-k6-operator setup-chaos-mesh check-chaos-mesh verify-chaos-mesh uninstall-chaos-mesh

setup-k6-operator:
	@echo "🚀 Checking if k6 operator is already installed..."
	@if kubectl get namespace $(K6_NAMESPACE) >/dev/null 2>&1; then \
		echo "✅ k6-operator already installed."; \
	else \
		echo "📦 Installing k6-operator..."; \
		curl -s $(K6_OPERATOR_BUNDLE) | kubectl apply -f -; \
		echo "✅ k6-operator installed successfully."; \
	fi

check-k6-operator:
	kubectl get pods -n $(K6_NAMESPACE) -l control-plane=controller-manager

uninstall-k6-operator:
	@curl -s $(K6_OPERATOR_BUNDLE) | kubectl delete -f - || true

setup-chaos-mesh:
	@echo "🚀 Checking if Chaos Mesh is already installed..."
	@if kubectl get namespace $(CHAOS_MESH_NAMESPACE) >/dev/null 2>&1; then \
		echo "✅ Chaos Mesh already installed."; \
	else \
		echo "📦 Installing Chaos Mesh..."; \
		kubectl create namespace $(CHAOS_MESH_NAMESPACE) || true; \
		helm repo add chaos-mesh https://charts.chaos-mesh.org || true; \
		helm repo update; \
		helm install chaos-mesh chaos-mesh/chaos-mesh \
			--namespace $(CHAOS_MESH_NAMESPACE) \
			--set chaosDaemon.runtime=containerd \
			--set chaosDaemon.socketPath=/run/containerd/containerd.sock; \
		echo "✅ Chaos Mesh installed successfully."; \
		echo "⏳ Waiting for Chaos Mesh to be ready..."; \
		kubectl wait --namespace $(CHAOS_MESH_NAMESPACE) \
			--for=condition=ready pod \
			--selector=app.kubernetes.io/name=chaos-mesh \
			--timeout=300s || true; \
	fi

check-chaos-mesh:
	@echo "🔍 Checking Chaos Mesh status..."
	@kubectl get pods -n $(CHAOS_MESH_NAMESPACE) || echo "Chaos Mesh namespace not found"

verify-chaos-mesh:
	@echo "🔍 Verificando instalación completa de Chaos Mesh..."
	@bash scripts/verify-chaos-mesh.sh

uninstall-chaos-mesh:
	@echo "🚀 Uninstalling Chaos Mesh..."
	@helm uninstall chaos-mesh --namespace $(CHAOS_MESH_NAMESPACE) || true
	@kubectl delete namespace $(CHAOS_MESH_NAMESPACE) || true
	@echo "✅ Chaos Mesh uninstalled successfully."

install-monitoring:
	@if [ -z "$(values_file)" ]; then \
		VALUES_FILE="apps/server/k8s/tilt/values-monitoring.yml"; \
	else \
		VALUES_FILE="$(values_file)"; \
	fi; \
	echo "🚀 Installing monitoring..."; \
	helm repo add prometheus-community https://prometheus-community.github.io/helm-charts || true; \
	helm repo update; \
	helm install monitoring prometheus-community/kube-prometheus-stack \
		--namespace default \
		-f $$VALUES_FILE; \
	echo "✅ Monitoring installed successfully."

uninstall-monitoring:
	@echo "🚀 Uninstalling monitoring..."
	helm uninstall monitoring --namespace default || true
	@echo "✅ Monitoring uninstalled successfully."

deploy-server-prod:
	@echo "🚀 Deploying server to production..."
	@chmod +x apps/server/deploy-prod.sh
	@./apps/server/deploy-prod.sh

deploy-webapp-prod:
	@echo "🚀 Deploying webapp to production..."
	@chmod +x apps/webapp/deploy-prod.sh
	@./apps/webapp/deploy-prod.sh

deploy-prod: deploy-server-prod deploy-webapp-prod
	@echo "✅ Full production deployment completed!"

kustomize-server-prod:
	@echo "🔍 Previewing server production deployment..."
	kubectl kustomize apps/server/k8s/kustomize/overlays/production/

kustomize-webapp-prod:
	@echo "🔍 Previewing webapp production deployment..."
	kubectl kustomize apps/webapp/k8s/kustomize/overlays/production/

test-prod-local:
	@echo "🧪 Testing production deployment locally..."
	@chmod +x scripts/test-prod-local.sh
	@./scripts/test-prod-local.sh

setup-browser-access:
	@echo "🌐 Setting up browser access for production..."
	@chmod +x scripts/setup-browser-access.sh
	@./scripts/setup-browser-access.sh

build-prod:
	@echo "🏗️ Building production images..."
	@chmod +x scripts/build-prod.sh
	@./scripts/build-prod.sh

clean-prod:
	@echo "🧹 Cleaning production environment..."
	make uninstall-k6-operator
	make uninstall-monitoring
	make uninstall-chaos-mesh
	@echo "🧹 Cleaning production environment..."
	kubectl delete namespace mimoq-prod || true

clean-test:
	@echo "🧹 Cleaning test cluster..."
	make uninstall-k6-operator
	make uninstall-monitoring
	make uninstall-chaos-mesh
	kind delete cluster --name mimoq-prod-local || true


