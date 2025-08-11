# services/storage_service.py
import boto3
from google.cloud import storage as gcs
from azure.storage.blob import BlobServiceClient
from django.conf import settings
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
import hashlib
import uuid
import os

class BaseStorageService:
    def upload_file(self, file, path=None):
        raise NotImplementedError
    
    def download_file(self, file_path):
        raise NotImplementedError
    
    def delete_file(self, file_path):
        raise NotImplementedError
    
    def get_file_url(self, file_path, expires_in=3600):
        raise NotImplementedError
    
    def calculate_checksum(self, file):
        """Calculate MD5 checksum of file"""
        hash_md5 = hashlib.md5()
        for chunk in file.chunks():
            hash_md5.update(chunk)
        return hash_md5.hexdigest()

class LocalStorageService(BaseStorageService):
    def upload_file(self, file, path=None):
        if not path:
            path = f"files/{uuid.uuid4()}/{file.name}"
        
        saved_path = default_storage.save(path, file)
        return {
            'path': saved_path,
            'url': default_storage.url(saved_path),
            'checksum': self.calculate_checksum(file)
        }
    
    def download_file(self, file_path):
        return default_storage.open(file_path)
    
    def delete_file(self, file_path):
        return default_storage.delete(file_path)
    
    def get_file_url(self, file_path, expires_in=3600):
        return default_storage.url(file_path)

class S3StorageService(BaseStorageService):
    def __init__(self):
        self.s3_client = boto3.client(
            's3',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_S3_REGION_NAME
        )
        self.bucket_name = settings.AWS_STORAGE_BUCKET_NAME
    
    def upload_file(self, file, path=None):
        if not path:
            path = f"files/{uuid.uuid4()}/{file.name}"
        
        try:
            # Upload file to S3
            self.s3_client.upload_fileobj(
                file, 
                self.bucket_name, 
                path,
                ExtraArgs={
                    'ContentType': file.content_type,
                    'ServerSideEncryption': 'AES256'
                }
            )
            
            # Generate URL
            url = f"https://{self.bucket_name}.s3.{settings.AWS_S3_REGION_NAME}.amazonaws.com/{path}"
            
            return {
                'path': path,
                'url': url,
                'checksum': self.calculate_checksum(file)
            }
        except Exception as e:
            raise Exception(f"Failed to upload to S3: {str(e)}")
    
    def download_file(self, file_path):
        try:
            response = self.s3_client.get_object(Bucket=self.bucket_name, Key=file_path)
            return response['Body']
        except Exception as e:
            raise Exception(f"Failed to download from S3: {str(e)}")
    
    def delete_file(self, file_path):
        try:
            self.s3_client.delete_object(Bucket=self.bucket_name, Key=file_path)
            return True
        except Exception as e:
            raise Exception(f"Failed to delete from S3: {str(e)}")
    
    def get_file_url(self, file_path, expires_in=3600):
        try:
            url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': self.bucket_name, 'Key': file_path},
                ExpiresIn=expires_in
            )
            return url
        except Exception as e:
            raise Exception(f"Failed to generate presigned URL: {str(e)}")

class GCPStorageService(BaseStorageService):
    def __init__(self):
        self.client = gcs.Client()
        self.bucket_name = settings.GCP_STORAGE_BUCKET_NAME
        self.bucket = self.client.bucket(self.bucket_name)
    
    def upload_file(self, file, path=None):
        if not path:
            path = f"files/{uuid.uuid4()}/{file.name}"
        
        try:
            blob = self.bucket.blob(path)
            blob.upload_from_file(file, content_type=file.content_type)
            
            return {
                'path': path,
                'url': blob.public_url,
                'checksum': self.calculate_checksum(file)
            }
        except Exception as e:
            raise Exception(f"Failed to upload to GCP: {str(e)}")
    
    def download_file(self, file_path):
        try:
            blob = self.bucket.blob(file_path)
            return blob.download_as_bytes()
        except Exception as e:
            raise Exception(f"Failed to download from GCP: {str(e)}")
    
    def delete_file(self, file_path):
        try:
            blob = self.bucket.blob(file_path)
            blob.delete()
            return True
        except Exception as e:
            raise Exception(f"Failed to delete from GCP: {str(e)}")
    
    def get_file_url(self, file_path, expires_in=3600):
        try:
            blob = self.bucket.blob(file_path)
            url = blob.generate_signed_url(expiration=expires_in)
            return url
        except Exception as e:
            raise Exception(f"Failed to generate signed URL: {str(e)}")

class AzureStorageService(BaseStorageService):
    def __init__(self):
        self.blob_service_client = BlobServiceClient(
            account_url=f"https://{settings.AZURE_ACCOUNT_NAME}.blob.core.windows.net",
            credential=settings.AZURE_ACCOUNT_KEY
        )
        self.container_name = settings.AZURE_CONTAINER
    
    def upload_file(self, file, path=None):
        if not path:
            path = f"files/{uuid.uuid4()}/{file.name}"
        
        try:
            blob_client = self.blob_service_client.get_blob_client(
                container=self.container_name, 
                blob=path
            )
            blob_client.upload_blob(file, overwrite=True)
            
            url = f"https://{settings.AZURE_ACCOUNT_NAME}.blob.core.windows.net/{self.container_name}/{path}"
            
            return {
                'path': path,
                'url': url,
                'checksum': self.calculate_checksum(file)
            }
        except Exception as e:
            raise Exception(f"Failed to upload to Azure: {str(e)}")
    
    def download_file(self, file_path):
        try:
            blob_client = self.blob_service_client.get_blob_client(
                container=self.container_name, 
                blob=file_path
            )
            return blob_client.download_blob().readall()
        except Exception as e:
            raise Exception(f"Failed to download from Azure: {str(e)}")
    
    def delete_file(self, file_path):
        try:
            blob_client = self.blob_service_client.get_blob_client(
                container=self.container_name, 
                blob=file_path
            )
            blob_client.delete_blob()
            return True
        except Exception as e:
            raise Exception(f"Failed to delete from Azure: {str(e)}")
    
    def get_file_url(self, file_path, expires_in=3600):
        # Azure blob URLs are public by default, or you can implement SAS tokens
        return f"https://{settings.AZURE_ACCOUNT_NAME}.blob.core.windows.net/{self.container_name}/{file_path}"

class StorageFactory:
    """Factory class to get the appropriate storage service"""
    
    @staticmethod
    def get_storage_service(storage_type='local'):
        services = {
            'local': LocalStorageService,
            'aws_s3': S3StorageService,
            'gcp': GCPStorageService,
            'azure': AzureStorageService,
        }
        
        service_class = services.get(storage_type)
        if not service_class:
            raise ValueError(f"Unsupported storage type: {storage_type}")
        
        return service_class()