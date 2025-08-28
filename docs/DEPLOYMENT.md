# Deployment Guide

Complete deployment guide for the AI Investor Pitch Advisor platform.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Local Development](#local-development)
- [Docker Deployment](#docker-deployment)
- [Kubernetes Deployment](#kubernetes-deployment)
- [AWS Deployment](#aws-deployment)
- [Monitoring Setup](#monitoring-setup)
- [Backup & Recovery](#backup--recovery)
- [Scaling](#scaling)

## Prerequisites

### Infrastructure Requirements
- **Kubernetes Cluster**: 1.24+ with 3+ nodes
- **PostgreSQL**: 16+ with 16GB RAM, 100GB storage
- **Redis**: 7+ with persistence enabled
- **NATS**: 2.9+ with JetStream enabled
- **S3/R2**: Storage bucket with CDN
- **Domain**: SSL certificate for HTTPS

### Software Requirements
- **Docker**: 24+
- **kubectl**: 1.24+
- **Helm**: 3.10+
- **Terraform**: 1.5+ (for AWS deployment)

## Local Development

### Quick Start
```bash
# Clone repository
git clone https://github.com/your-org/ai-investor-pitch-advisor.git
cd ai-investor-pitch-advisor

# Install dependencies
npm install

# Start all services
npm run dev

# Access application
# Frontend: http://localhost:3000
# API: http://localhost:3001
# API Docs: http://localhost:3001/api/docs
```

### Development Environment
```bash
# Start individual services
npm run dev:frontend  # Next.js on port 3000
npm run dev:api      # NestJS on port 3001

# Start workers separately
cd workers/parse && python main.py
cd workers/analysis && python main.py
cd workers/qa && python main.py
cd workers/suggestions && python main.py
cd workers/export && python main.py
```

### Database Setup
```bash
# Start local PostgreSQL and Redis
docker-compose up -d postgres redis nats

# Run database migrations
cd api && npm run migration:run

# Seed initial data (optional)
npm run seed
```

## Docker Deployment

### Build Images
```bash
# Build all services
docker-compose build

# Or build individually
docker build -t pitch-advisor-frontend ./frontend
docker build -t pitch-advisor-api ./api
docker build -t pitch-advisor-worker ./workers
```

### Docker Compose (Staging)
```yaml
# docker-compose.staging.yml
version: '3.8'

services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: pitch_advisor
      POSTGRES_USER: pitch_advisor
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"

  nats:
    image: nats:2.9
    command: ["-js", "-m", "8222"]
    ports:
      - "4222:4222"
      - "8222:8222"

  frontend:
    image: pitch-advisor-frontend:latest
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=https://api.yourdomain.com

  api:
    image: pitch-advisor-api:latest
    ports:
      - "3001:3001"
    environment:
      - DATABASE_URL=postgresql://pitch_advisor:${DB_PASSWORD}@postgres:5432/pitch_advisor
      - REDIS_URL=redis://redis:6379
      - NATS_URL=nats://nats:4222
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - postgres
      - redis
      - nats

  worker:
    image: pitch-advisor-worker:latest
    environment:
      - DATABASE_URL=postgresql://pitch_advisor:${DB_PASSWORD}@postgres:5432/pitch_advisor
      - REDIS_URL=redis://redis:6379
      - NATS_URL=nats://nats:4222
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    depends_on:
      - postgres
      - redis
      - nats
    deploy:
      replicas: 3

volumes:
  postgres_data:
  redis_data:
```

### Deploy Staging
```bash
# Set environment variables
export DB_PASSWORD="your-secure-password"
export JWT_SECRET="your-jwt-secret"
export OPENAI_API_KEY="your-openai-key"

# Deploy
docker-compose -f docker-compose.staging.yml up -d

# Run migrations
docker-compose -f docker-compose.staging.yml exec api npm run migration:run
```

## Kubernetes Deployment

### Prerequisites
```bash
# Install NGINX Ingress Controller
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.1/deploy/static/provider/cloud/deploy.yaml

# Install cert-manager for SSL
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.12.0/cert-manager.yaml

# Install PostgreSQL operator (optional)
kubectl apply -f https://raw.githubusercontent.com/zalando/postgres-operator/master/manifests/postgres-operator.yaml
```

### Namespace and Secrets
```bash
# Create namespace
kubectl create namespace pitch-advisor

# Create secrets
kubectl create secret generic db-secret \
  --from-literal=password='your-secure-db-password' \
  --namespace pitch-advisor

kubectl create secret generic jwt-secret \
  --from-literal=secret='your-jwt-secret' \
  --namespace pitch-advisor

kubectl create secret generic openai-secret \
  --from-literal=api-key='your-openai-api-key' \
  --namespace pitch-advisor
```

### PostgreSQL Deployment
```yaml
# k8s/postgres.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: pitch-advisor
spec:
  serviceName: postgres
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:16
        ports:
        - containerPort: 5432
        env:
        - name: POSTGRES_DB
          value: pitch_advisor
        - name: POSTGRES_USER
          value: pitch_advisor
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: password
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
        resources:
          requests:
            memory: "2Gi"
            cpu: "1000m"
          limits:
            memory: "4Gi"
            cpu: "2000m"
  volumeClaimTemplates:
  - metadata:
      name: postgres-storage
    spec:
      accessModes: [ "ReadWriteOnce" ]
      resources:
        requests:
          storage: 100Gi
```

### Redis Deployment
```yaml
# k8s/redis.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  namespace: pitch-advisor
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        ports:
        - containerPort: 6379
        command: ["redis-server", "--appendonly", "yes"]
        volumeMounts:
        - name: redis-storage
          mountPath: /data
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
      volumes:
      - name: redis-storage
        persistentVolumeClaim:
          claimName: redis-pvc
```

### API Deployment
```yaml
# k8s/api.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
  namespace: pitch-advisor
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
      - name: api
        image: pitch-advisor-api:latest
        ports:
        - containerPort: 3001
        env:
        - name: DATABASE_URL
          value: postgresql://pitch_advisor:$(DB_PASSWORD)@postgres:5432/pitch_advisor
        - name: REDIS_URL
          value: redis://redis:6379
        - name: NATS_URL
          value: nats://nats:4222
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: jwt-secret
              key: secret
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: password
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 5
          periodSeconds: 5
```

### Worker Deployment
```yaml
# k8s/worker.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: worker
  namespace: pitch-advisor
spec:
  replicas: 5
  selector:
    matchLabels:
      app: worker
  template:
    metadata:
      labels:
        app: worker
    spec:
      containers:
      - name: worker
        image: pitch-advisor-worker:latest
        env:
        - name: DATABASE_URL
          value: postgresql://pitch_advisor:$(DB_PASSWORD)@postgres:5432/pitch_advisor
        - name: REDIS_URL
          value: redis://redis:6379
        - name: NATS_URL
          value: nats://nats:4222
        - name: OPENAI_API_KEY
          valueFrom:
            secretKeyRef:
              name: openai-secret
              key: api-key
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: password
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
```

### Ingress Configuration
```yaml
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: pitch-advisor-ingress
  namespace: pitch-advisor
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - yourdomain.com
    - api.yourdomain.com
    secretName: pitch-advisor-tls
  rules:
  - host: yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend
            port:
              number: 3000
  - host: api.yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api
            port:
              number: 3001
```

### Deploy to Kubernetes
```bash
# Apply all configurations
kubectl apply -f k8s/

# Wait for deployments
kubectl wait --for=condition=available --timeout=300s deployment/api -n pitch-advisor
kubectl wait --for=condition=available --timeout=300s deployment/worker -n pitch-advisor

# Run database migrations
kubectl exec -it deployment/api -n pitch-advisor -- npm run migration:run

# Check status
kubectl get pods -n pitch-advisor
kubectl get services -n pitch-advisor
kubectl get ingress -n pitch-advisor
```

## AWS Deployment

### Terraform Infrastructure
```hcl
# infrastructure/main.tf
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# VPC and Networking
module "vpc" {
  source = "terraform-aws-modules/vpc/aws"

  name = "pitch-advisor-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["${var.aws_region}a", "${var.aws_region}b", "${var.aws_region}c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = true
}

# RDS PostgreSQL
module "db" {
  source = "terraform-aws-modules/rds/aws"

  identifier = "pitch-advisor-db"

  engine            = "postgres"
  engine_version    = "16"
  instance_class    = "db.r6g.large"
  allocated_storage = 100

  db_name  = "pitch_advisor"
  username = "pitch_advisor"
  port     = "5432"

  vpc_security_group_ids = [aws_security_group.rds.id]
  subnet_ids             = module.vpc.private_subnets

  family = "postgres16"

  skip_final_snapshot = true
}

# ElastiCache Redis
module "redis" {
  source = "terraform-aws-modules/elasticache/aws"

  cluster_id      = "pitch-advisor-redis"
  engine          = "redis"
  engine_version  = "7.0"
  node_type       = "cache.t3.micro"
  num_cache_nodes = 1

  subnet_ids         = module.vpc.private_subnets
  security_group_ids = [aws_security_group.redis.id]
}

# EKS Cluster
module "eks" {
  source = "terraform-aws-modules/eks/aws"

  cluster_name    = "pitch-advisor-eks"
  cluster_version = "1.27"

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  eks_managed_node_groups = {
    general = {
      desired_size = 3
      min_size     = 1
      max_size     = 5

      instance_types = ["t3.large"]
      capacity_type  = "ON_DEMAND"
    }

    workers = {
      desired_size = 5
      min_size     = 2
      max_size     = 10

      instance_types = ["t3.large"]
      capacity_type  = "ON_DEMAND"

      labels = {
        role = "worker"
      }
    }
  }
}

# S3 Bucket
module "s3_bucket" {
  source = "terraform-aws-modules/s3-bucket/aws"

  bucket = "pitch-advisor-exports-${random_pet.bucket_suffix.id}"

  versioning = {
    enabled = true
  }

  server_side_encryption_configuration = {
    rule = {
      apply_server_side_encryption_by_default = {
        sse_algorithm = "AES256"
      }
    }
  }
}

# CloudFront CDN
module "cdn" {
  source = "terraform-aws-modules/cloudfront/aws"

  aliases = ["cdn.yourdomain.com"]

  origin = {
    s3_bucket = {
      domain_name = module.s3_bucket.s3_bucket_bucket_regional_domain_name
    }
  }

  default_cache_behavior = {
    target_origin_id       = "s3_bucket"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods         = ["GET", "HEAD"]
  }
}
```

### AWS Deployment Steps
```bash
# Initialize Terraform
cd infrastructure
terraform init

# Plan deployment
terraform plan -var-file=production.tfvars

# Deploy infrastructure
terraform apply -var-file=production.tfvars

# Get EKS cluster credentials
aws eks update-kubeconfig --region us-east-1 --name pitch-advisor-eks

# Deploy application
kubectl apply -f k8s/

# Setup monitoring
kubectl apply -f monitoring/
```

## Monitoring Setup

### Prometheus & Grafana
```yaml
# monitoring/prometheus.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: prometheus
  namespace: monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: prometheus
  template:
    metadata:
      labels:
        app: prometheus
    spec:
      containers:
      - name: prometheus
        image: prom/prometheus:latest
        ports:
        - containerPort: 9090
        volumeMounts:
        - name: config
          mountPath: /etc/prometheus
      volumes:
      - name: config
        configMap:
          name: prometheus-config
```

### Application Metrics
```typescript
// api/src/common/metrics.ts
import { register, collectDefaultMetrics, Gauge, Counter, Histogram } from 'prom-client';

collectDefaultMetrics();

export const metrics = {
  // Request metrics
  httpRequestsTotal: new Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code']
  }),

  httpRequestDuration: new Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests',
    labelNames: ['method', 'route'],
    buckets: [0.1, 0.5, 1, 2, 5, 10]
  }),

  // Business metrics
  decksUploaded: new Counter({
    name: 'decks_uploaded_total',
    help: 'Total number of decks uploaded'
  }),

  analysesCompleted: new Counter({
    name: 'analyses_completed_total',
    help: 'Total number of analyses completed'
  }),

  qaSessionsCreated: new Counter({
    name: 'qa_sessions_created_total',
    help: 'Total number of Q&A sessions created'
  }),

  // System metrics
  activeWorkers: new Gauge({
    name: 'active_workers',
    help: 'Number of active worker processes'
  }),

  queueSize: new Gauge({
    name: 'queue_size',
    help: 'Current queue size for background jobs'
  })
};
```

### Alerting Rules
```yaml
# monitoring/alerts.yaml
groups:
- name: pitch-advisor
  rules:
  - alert: HighErrorRate
    expr: rate(http_requests_total{status_code=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.05
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "High error rate detected"
      description: "Error rate is {{ $value }}%"

  - alert: HighLatency
    expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 5
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High latency detected"
      description: "95th percentile latency is {{ $value }}s"

  - alert: LowWorkerCount
    expr: active_workers < 3
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Low worker count"
      description: "Only {{ $value }} workers are active"
```

## Backup & Recovery

### Database Backup
```bash
# Automated daily backup
kubectl create cronjob postgres-backup \
  --image=postgres:16 \
  --schedule="0 2 * * *" \
  -- pg_dump -h postgres -U pitch_advisor pitch_advisor > /backup/backup-$(date +%Y%m%d).sql
```

### Disaster Recovery
```bash
# Restore from backup
kubectl run restore-job \
  --image=postgres:16 \
  --restart=Never \
  -- psql -h postgres -U pitch_advisor pitch_advisor < /backup/backup.sql
```

### Data Retention
- **Database backups**: 30 days
- **File exports**: 90 days
- **Logs**: 7 days
- **Metrics**: 1 year

## Scaling

### Horizontal Pod Autoscaling
```yaml
# k8s/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-hpa
  namespace: pitch-advisor
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### Worker Scaling
```yaml
# Worker HPA based on queue size
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: worker-hpa
  namespace: pitch-advisor
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: worker
  minReplicas: 2
  maxReplicas: 20
  metrics:
  - type: External
    external:
      metric:
        name: queue_size
        selector:
          matchLabels:
            queue: "pitch-advisor-jobs"
      target:
        type: Value
        value: "10"
```

### Database Scaling
```bash
# Scale PostgreSQL read replicas
kubectl scale statefulset postgres --replicas=3

# Connection pooling with PgBouncer
kubectl apply -f pgbouncer.yaml
```

## Troubleshooting

### Common Issues

#### Database Connection Issues
```bash
# Check database connectivity
kubectl exec -it deployment/api -n pitch-advisor -- nc -zv postgres 5432

# View database logs
kubectl logs -f statefulset/postgres -n pitch-advisor
```

#### Worker Not Processing Jobs
```bash
# Check worker logs
kubectl logs -f deployment/worker -n pitch-advisor

# Check queue status
kubectl exec -it deployment/redis -n pitch-advisor -- redis-cli LLEN pitch_advisor_queue
```

#### High Memory Usage
```bash
# Check pod memory usage
kubectl top pods -n pitch-advisor

# View detailed metrics
kubectl describe pod <pod-name> -n pitch-advisor
```

#### SSL Certificate Issues
```bash
# Check certificate status
kubectl get certificate -n pitch-advisor

# Renew certificate
kubectl delete certificate pitch-advisor-tls -n pitch-advisor
kubectl apply -f k8s/ingress.yaml
```

## Security Checklist

### Pre-deployment
- [ ] All secrets stored in Kubernetes secrets or AWS Secrets Manager
- [ ] Database passwords rotated and complex
- [ ] JWT secrets generated securely
- [ ] OpenAI API keys restricted to specific endpoints
- [ ] Network policies configured for pod-to-pod communication
- [ ] SecurityContext configured for all pods
- [ ] Resource limits set for all containers

### Post-deployment
- [ ] Security scanning completed (Trivy, Snyk)
- [ ] Penetration testing performed
- [ ] Rate limiting configured and tested
- [ ] Audit logging enabled and monitored
- [ ] Backup strategy implemented and tested
- [ ] Disaster recovery plan documented and tested

This deployment guide provides comprehensive instructions for deploying the AI Investor Pitch Advisor platform in various environments. For specific configuration adjustments or troubleshooting help, please refer to the project documentation or create an issue in the repository.
