variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}

variable "db_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}

variable "bucket_name" {
  description = "S3 bucket name for storage"
  type        = string
  default     = "pitch-advisor-storage"
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = "pitch-advisor.example.com"
}
