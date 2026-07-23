# Synmetrix Kubernetes Deployment Guide

## Prerequisites
- Kubernetes cluster (1.19+)
- kubectl configured
- Docker registry access
- Ingress controller (nginx) installed

## Deployment Steps

### 1. Build Docker Images

```bash
# Build Cube.js backend
docker build -f Dockerfile.cubejs -t your-registry/synmetrix-cubejs:latest .
docker push your-registry/synmetrix-cubejs:latest

# Build React frontend
docker build -f Dockerfile.frontend -t your-registry/synmetrix-frontend:latest .
docker push your-registry/synmetrix-frontend:latest
```

### 2. Update Configuration

Edit `k8s/secret.yaml`:
- Change `CUBEJS_API_SECRET` to a strong random string

Edit `k8s/deployment.yaml`:
- Replace `your-registry` with your actual Docker registry

Edit `k8s/ingress.yaml`:
- Replace `synmetrix.yourdomain.com` with your domain

### 3. Deploy to Kubernetes

```bash
# Create namespace (optional)
kubectl create namespace synmetrix

# Apply configurations
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml

# Check deployment status
kubectl get pods
kubectl get services
kubectl get ingress
```

### 4. Verify Deployment

```bash
# Check Cube.js pods
kubectl logs -l app=cubejs

# Check frontend pods
kubectl logs -l app=frontend

# Test Cube.js API
kubectl port-forward svc/cubejs-service 4000:4000
curl https://jkhudd.mycitydemo.in/api/health

# Test frontend
kubectl port-forward svc/frontend-service 8080:80
# Open browser: http://localhost:8080
```

### 5. Access Application

**LoadBalancer (Cloud):**
```bash
kubectl get svc frontend-service
# Use EXTERNAL-IP to access app
```

**Ingress (with domain):**
```
https://synmetrix.yourdomain.com
```

**Port Forward (local testing):**
```bash
kubectl port-forward svc/frontend-service 8080:80
```

## Architecture

```
Internet/Users
    ↓
Ingress (nginx)
    ↓
    ├─→ Frontend Service (LoadBalancer/ClusterIP) → Frontend Pods (nginx:80)
    └─→ Cube.js Service (ClusterIP) → Cube.js Pods (node:4000)
                                           ↓
                                    PostgreSQL (External: <YOUR_DB_HOST>:<YOUR_DB_PORT>)
```

## Scaling

```bash
# Scale Cube.js for more load
kubectl scale deployment cubejs-deployment --replicas=5

# Scale frontend
kubectl scale deployment frontend-deployment --replicas=3

# Auto-scaling (HPA)
kubectl autoscale deployment cubejs-deployment --cpu-percent=70 --min=2 --max=10
```

## Updates

```bash
# Build new image
docker build -f Dockerfile.cubejs -t your-registry/synmetrix-cubejs:v2 .
docker push your-registry/synmetrix-cubejs:v2

# Update deployment
kubectl set image deployment/cubejs-deployment cubejs=your-registry/synmetrix-cubejs:v2

# Rollback if needed
kubectl rollout undo deployment/cubejs-deployment
```

## Monitoring

```bash
# Watch pods
kubectl get pods -w

# View logs
kubectl logs -f deployment/cubejs-deployment
kubectl logs -f deployment/frontend-deployment

# Describe resources
kubectl describe pod <pod-name>
kubectl describe service cubejs-service
```

## Troubleshooting

**Pods not starting:**
```bash
kubectl describe pod <pod-name>
kubectl logs <pod-name>
```

**Database connection issues:**
- Check secret: `kubectl get secret synmetrix-secrets -o yaml`
- Verify network: Ensure K8s cluster can reach <YOUR_DB_HOST>:<YOUR_DB_PORT>
- Test from pod: `kubectl exec -it <pod-name> -- nc -zv <YOUR_DB_HOST> <YOUR_DB_PORT>`

**Frontend can't reach Cube.js:**
- Update REACT_APP_CUBEJS_API_URL in ConfigMap
- Rebuild frontend image with correct API URL
- Use Ingress path routing for single domain

## Production Recommendations

1. **Use Redis for Cube.js cache:**
   - Deploy Redis StatefulSet
   - Set CUBEJS_CACHE_AND_QUEUE_DRIVER=redis

2. **Enable SSL/TLS:**
   - Use cert-manager for automatic certificates
   - Add TLS configuration to Ingress

3. **Add resource limits:**
   - Already configured in deployment.yaml
   - Adjust based on load testing

4. **Use Persistent Volumes:**
   - If storing Cube.js cache locally
   - PVC for pre-aggregations

5. **Add monitoring:**
   - Prometheus + Grafana
   - Cube.js metrics endpoint

6. **Secrets management:**
   - Use external secrets (AWS Secrets Manager, Vault)
   - Rotate credentials regularly
