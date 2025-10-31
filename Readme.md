# MimoQ - Kubernetes Load Testing Platform

## Quick Start

### Development Environment

- Install [Kind](https://kind.sigs.k8s.io/docs/user/quick-start/)
- Install [Tilt](https://docs.tilt.dev/install.html)
- Install [Helm](https://helm.sh/docs/intro/install/)

1. Create local cluster:
   ```bash
   kind create cluster --config kind.yaml
   ```

2. Setup K6 operator:
   ```bash
   make setup-k6-operator
   ```

3. Install monitoring:
   ```bash
   make install-monitoring
   ```

4. Start development:
   ```bash
   tilt up
   ```

## Production Deployment

### Prerequisites

- Kubernetes cluster (kubeadm, EKS, GKE, AKS, etc.)
- `kubectl` configured to access your cluster
- Docker for building images
- Helm (for monitoring)

### Deployment Steps

1. **Build production images:**
   ```bash
   make build-prod
   ```

2. **Sync configuration files:**
   
   Make sure that your files inside kustomize are up to date

3. **Set up the k6 operator**

   ```bash
   make setup-k6-operator
   ```
4. **Install monitoring**
   ```bash
   make install-monitoring values_file=apps/server/k8s/kustomize/base/values-monitoring.yml
   ```
   
5. **Deploy to production:**
   ```bash
   make deploy-prod
   ```

6. **Setup browser access:**
   ```bash
   make setup-browser-access
   ```

### Testing Production Locally

Before deploying to a real cluster, you can test the production configuration locally:

```bash
# Test production deployment locally
make test-prod-local

# Clean up test cluster
make clean-test
```

### Available Commands

| Command | Description |
|---------|-------------|
| `make build-prod` | Build production Docker images |
| `make sync-kustomize` | Sync Tilt files to Kustomize |
| `make deploy-prod` | Deploy to production cluster |
| `make setup-browser-access` | Configure browser access |
| `make test-prod-local` | Test production locally with Kind |
| `make clean-prod` | Clean production environment |
| `make clean-test` | Clean test cluster |

### Production Architecture

- **Webapp**: Angular app served by Nginx
- **Server**: NestJS API with PostgreSQL
- **Monitoring**: Prometheus + Grafana
- **Load Testing**: K6 with custom metrics
- **Ingress**: NGINX Ingress Controller

### Access Points

After deployment:
- **Application**: `http://mimoq.local`
- **API**: `http://mimoq.local/api`
- **Monitoring**: Configure port-forward to access Prometheus/Grafana

## Updating Individual Components in production (on-premise cluster)

### Update Server Only (code changes)

When you change server code (files in `apps/server/src/`), you need to rebuild the image and update the deployment:

1. **Build the new image:**
   ```bash
   docker build -f apps/server/Dockerfile.prod -t gfalbarracinr/server:latest apps/server/
   ```

2. **Push the image to registry** (if applicable):
   ```bash
   docker push gfalbarracinr/server:latest
   ```

3. **Restart the deployment to apply changes:**
   ```bash
   kubectl rollout restart deployment/server
   kubectl rollout status deployment/server --timeout=5m
   ```

   To verify status:
   ```bash
   kubectl get pods -l app=server
   kubectl logs -l app=server --tail=50
   ```

### Update Webapp Only (code changes)

When you change webapp code (files in `apps/webapp/src/`), you need to rebuild the image and update the deployment:

1. **Build the new image:**
   ```bash
   docker build -f apps/webapp/Dockerfile -t gfalbarracinr/webapp:latest apps/webapp/
   ```

2. **Push the image to registry** (if applicable):
   ```bash
   docker push gfalbarracinr/webapp:latest
   ```

3. **Restart the deployment to apply changes:**
   ```bash
   kubectl rollout restart deployment/webapp
   kubectl rollout status deployment/webapp --timeout=5m
   ```

   To verify status:
   ```bash
   kubectl get pods -l app=webapp
   kubectl logs -l app=webapp --tail=50
   ```

### Update Kubernetes Manifests Only

When you change Kubernetes configuration files (`.yml` files in `k8s/kustomize/`), you only need to apply the changes:

**For the server:**
```bash
cd apps/server
kubectl apply -k k8s/kustomize/overlays/production/
cd ../..
```

**For the webapp:**
```bash
cd apps/webapp
kubectl apply -k k8s/kustomize/overlays/production/
cd ../..
```



