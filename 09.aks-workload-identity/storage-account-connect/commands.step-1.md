## Login To Azure
```shell
az login
```

## To import all the vars from .env 
```shell
cd 09.aks-workload-identity/storage-account-connect
source ./.env
echo SUBSCRIPTION_ID = $SUBSCRIPTION_ID
echo RESOURCE_GROUP = $RESOURCE_GROUP
echo STORAGE_ACCOUNT_NAME = $STORAGE_ACCOUNT_NAME
echo LOCATION = $LOCATION
echo AKS_CLUSTER_NAME = $AKS_CLUSTER_NAME
```

## Create Resource 
## Create AKS
## Get the cluster Credentials
```shell
az group create \
  --subscription $SUBSCRIPTION_ID \
  --name $RESOURCE_GROUP \
  --location $LOCATION
az aks create \
  --subscription $SUBSCRIPTION_ID \
  --resource-group $RESOURCE_GROUP \
  --name $AKS_CLUSTER_NAME \
  --location $LOCATION \
  --node-count 1 \
  --node-vm-size Standard_B4ms \
  --enable-oidc-issuer \
  --enable-workload-identity \
  --generate-ssh-keys
az aks get-credentials --resource-group $RESOURCE_GROUP --name $AKS_CLUSTER_NAME
```