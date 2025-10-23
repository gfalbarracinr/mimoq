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
	@echo "🚀 Installing monitoring..."
	helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
	helm repo update
	helm install monitoring prometheus-community/kube-prometheus-stack \
	--namespace default \
	-f apps/server/k8s/values-monitoring.yml
	@echo "✅ Monitoring installed successfully."

uninstall-monitoring:
	@echo "🚀 Uninstalling monitoring..."
	helm uninstall monitoring --namespace default || true
	@echo "✅ Monitoring uninstalled successfully."


