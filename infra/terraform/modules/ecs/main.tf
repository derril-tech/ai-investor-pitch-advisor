# ECS module - placeholder for now
# In production, this would create ECS cluster and services

output "cluster_name" {
  description = "ECS cluster name"
  value       = "${var.environment}-pitch-advisor-cluster"
}
