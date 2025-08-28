# ALB module - placeholder for now
# In production, this would create Application Load Balancer

output "dns_name" {
  description = "ALB DNS name"
  value       = "alb.${var.environment}.pitch-advisor.example.com"
}
