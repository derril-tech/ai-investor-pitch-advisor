import structlog
import boto3
from botocore.exceptions import ClientError
from typing import Optional
import os

logger = structlog.get_logger()

class StorageService:
    def __init__(self, s3_bucket: str, aws_region: str = "us-east-1"):
        self.s3_bucket = s3_bucket
        self.s3_client = boto3.client('s3', region_name=aws_region)

    async def upload_file(self, file_path: str, s3_key: str) -> bool:
        """Upload file to S3"""
        try:
            logger.info("Uploading file to S3", file_path=file_path, s3_key=s3_key)

            self.s3_client.upload_file(file_path, self.s3_bucket, s3_key)

            logger.info("File uploaded successfully", s3_key=s3_key)
            return True

        except ClientError as e:
            logger.error("Error uploading file to S3", error=str(e), s3_key=s3_key)
            return False
        except Exception as e:
            logger.error("Unexpected error uploading file", error=str(e), file_path=file_path)
            return False

    async def generate_signed_url(self, s3_key: str, expiration: int = 3600) -> Optional[str]:
        """Generate signed URL for file download"""
        try:
            logger.info("Generating signed URL", s3_key=s3_key, expiration=expiration)

            url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': self.s3_bucket, 'Key': s3_key},
                ExpiresIn=expiration
            )

            logger.info("Signed URL generated", s3_key=s3_key)
            return url

        except ClientError as e:
            logger.error("Error generating signed URL", error=str(e), s3_key=s3_key)
            return None
        except Exception as e:
            logger.error("Unexpected error generating signed URL", error=str(e), s3_key=s3_key)
            return None

    async def delete_file(self, s3_key: str) -> bool:
        """Delete file from S3"""
        try:
            logger.info("Deleting file from S3", s3_key=s3_key)

            self.s3_client.delete_object(Bucket=self.s3_bucket, Key=s3_key)

            logger.info("File deleted successfully", s3_key=s3_key)
            return True

        except ClientError as e:
            logger.error("Error deleting file from S3", error=str(e), s3_key=s3_key)
            return False
        except Exception as e:
            logger.error("Unexpected error deleting file", error=str(e), s3_key=s3_key)
            return False

    async def file_exists(self, s3_key: str) -> bool:
        """Check if file exists in S3"""
        try:
            self.s3_client.head_object(Bucket=self.s3_bucket, Key=s3_key)
            return True
        except ClientError as e:
            if e.response['Error']['Code'] == '404':
                return False
            else:
                logger.error("Error checking file existence", error=str(e), s3_key=s3_key)
                return False
        except Exception as e:
            logger.error("Unexpected error checking file existence", error=str(e), s3_key=s3_key)
            return False
