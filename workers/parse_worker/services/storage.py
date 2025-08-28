import boto3
import structlog
from typing import Optional
from botocore.exceptions import ClientError

logger = structlog.get_logger()

class StorageService:
    def __init__(self, endpoint_url: str, access_key: str, secret_key: str, bucket_name: str):
        self.endpoint_url = endpoint_url
        self.access_key = access_key
        self.secret_key = secret_key
        self.bucket_name = bucket_name
        
        # Initialize S3 client
        self.s3_client = boto3.client(
            's3',
            endpoint_url=endpoint_url,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            region_name='us-east-1'
        )
        
        # Ensure bucket exists
        self._ensure_bucket_exists()
    
    def _ensure_bucket_exists(self):
        """Ensure the S3 bucket exists"""
        try:
            self.s3_client.head_bucket(Bucket=self.bucket_name)
        except ClientError as e:
            if e.response['Error']['Code'] == '404':
                # Bucket doesn't exist, create it
                self.s3_client.create_bucket(Bucket=self.bucket_name)
                logger.info("Created S3 bucket", bucket_name=self.bucket_name)
            else:
                raise
    
    async def upload_file(self, key: str, data: bytes, content_type: str = "application/octet-stream") -> str:
        """Upload file to S3"""
        try:
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=key,
                Body=data,
                ContentType=content_type
            )
            
            logger.info("File uploaded to S3", key=key, bucket=self.bucket_name)
            return key
            
        except Exception as e:
            logger.error("Failed to upload file to S3", key=key, error=str(e))
            raise
    
    async def download_file(self, key: str) -> bytes:
        """Download file from S3"""
        try:
            response = self.s3_client.get_object(Bucket=self.bucket_name, Key=key)
            data = response['Body'].read()
            
            logger.info("File downloaded from S3", key=key, size=len(data))
            return data
            
        except Exception as e:
            logger.error("Failed to download file from S3", key=key, error=str(e))
            raise
    
    async def delete_file(self, key: str) -> bool:
        """Delete file from S3"""
        try:
            self.s3_client.delete_object(Bucket=self.bucket_name, Key=key)
            
            logger.info("File deleted from S3", key=key)
            return True
            
        except Exception as e:
            logger.error("Failed to delete file from S3", key=key, error=str(e))
            return False
    
    def get_signed_url(self, key: str, expiration: int = 3600) -> str:
        """Generate signed URL for file access"""
        try:
            url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': self.bucket_name, 'Key': key},
                ExpiresIn=expiration
            )
            
            return url
            
        except Exception as e:
            logger.error("Failed to generate signed URL", key=key, error=str(e))
            raise
