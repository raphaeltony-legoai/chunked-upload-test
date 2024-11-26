from azure.storage.blob import BlobServiceClient

class ADLS():

    def __init__(self, config: dict) -> None:
        self.account_name = config.account_name
        self.account_key =  config.account_key
        self.container_name = config.container_name

    def upload_file_to_path(self, file_obj, path_with_file_name:str):
        try:
            # Create a BlobServiceClient using the account name and access key
            connection_string = f"DefaultEndpointsProtocol=https;AccountName={self.account_name};AccountKey={self.account_key};EndpointSuffix=core.windows.net"
            blob_service_client = BlobServiceClient.from_connection_string(connection_string)
            
            blob_client = blob_service_client.get_blob_client(
                container=self.container_name, 
                blob= path_with_file_name
            )
            blob_client.upload_blob(file_obj)
            
            print(f"File uploaded successfully to path: {path_with_file_name}")
            return path_with_file_name
            # return True #subfolder_name # TODO
        except Exception as e:
            print(f"Error uploading file to path {path_with_file_name}: {e}")
            return False