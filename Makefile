K6_OPERATOR_BUNDLE=https://raw.githubusercontent.com/grafana/k6-operator/main/bundle.yaml
K6_NAMESPACE=k6-operator-system

.PHONY: setup-k6-operator check-k6-operator uninstall-k6-operator

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

install-monitoring:
	@if [ -z "$(values_file)" ]; then \
		values_file=apps/server/k8s/tilt/values-monitoring.yml; \
	fi
	@echo "🚀 Installing monitoring..."
	helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
	helm repo update
	helm install monitoring prometheus-community/kube-prometheus-stack \
	--namespace default \
	-f $(values_file)
	@echo "✅ Monitoring installed successfully."

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
	@echo "🧹 Cleaning production environment..."
	kubectl delete namespace mimoq-prod || true

clean-test:
	@echo "🧹 Cleaning test cluster..."
	make uninstall-k6-operator
	make uninstall-monitoring
	kind delete cluster --name mimoq-prod-local || true


