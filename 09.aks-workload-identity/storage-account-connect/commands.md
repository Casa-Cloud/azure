To import all the vars from .env 

## Login To Azure
```shell
az login
```

## To import all the vars from .env 
```shell
source ./.env
```

## Check all ENV vars 
```shell
echo SUBSCRIPTION_ID = $SUBSCRIPTION_ID
echo RESOURCE_GROUP = $RESOURCE_GROUP
echo STORAGE_ACCOUNT_NAME = $STORAGE_ACCOUNT_NAME
echo LOCATION = $LOCATION
echo AKS_CLUSTER_NAME = $AKS_CLUSTER_NAME
```

## Create Resource Group
```shell
az group create \
  --subscription $SUBSCRIPTION_ID \
  --name $RESOURCE_GROUP \
  --location $LOCATION
```

## Create AKS
```shell
az aks create \
  --subscription $SUBSCRIPTION_ID \
  --resource-group $RESOURCE_GROUP \
  --name $AKS_CLUSTER_NAME \
  --location $LOCATION \
  --node-count 1 \
  --enable-oidc-issuer \
  --enable-workload-identity \
  --generate-ssh-keys
```

## Get the cluster Credentials
```shell
az aks get-credentials --resource-group $RESOURCE_GROUP --name $AKS_CLUSTER_NAME
```

## Create Identity
```
az identity create \
--resource-group $RESOURCE_GROUP \
--name $IDENTITY_NAME
```

## Get the Client ID of workload Identity
```
CLIENT_ID=$(az identity show \
  --subscription "$SUBSCRIPTION_ID" \
  --resource-group "$RESOURCE_GROUP" \
  --name "$IDENTITY_NAME" \
  --query clientId \
  --output tsv)

echo $CLIENT_ID
```

## Get Principal ID 
```shell
PRINCIPAL_ID=$(az identity show \
  --subscription "$SUBSCRIPTION_ID" \
  --resource-group "$RESOURCE_GROUP" \
  --name "$IDENTITY_NAME" \
  --query principalId \
  --output tsv)

echo "$PRINCIPAL_ID"
```

## Create storage account
```shell
# Check
az storage account check-name \
  --name "$STORAGE_ACCOUNT_NAME"
# Create
az storage account create \
  --subscription "$SUBSCRIPTION_ID" \
  --resource-group "$RESOURCE_GROUP" \
  --name "$STORAGE_ACCOUNT_NAME" \
  --location "$LOCATION" \
  --sku Standard_LRS \
  --kind StorageV2 \
  --https-only true \
  --min-tls-version TLS1_2 \
  --allow-blob-public-access false \
  --allow-shared-key-access false
# Verify
STORAGE_SCOPE=$(az storage account show \
  --subscription "$SUBSCRIPTION_ID" \
  --resource-group "$RESOURCE_GROUP" \
  --name "$STORAGE_ACCOUNT_NAME" \
  --query id \
  --output tsv)

echo "$STORAGE_SCOPE"
```

## Provide Blob storage Contributor RBAC to Identity
```shell
az role assignment create \
  --assignee-object-id "$PRINCIPAL_ID" \
  --assignee-principal-type ServicePrincipal \
  --role "Storage Blob Data Contributor" \
  --scope "$STORAGE_SCOPE"
```

### Verify RBAC

```shell
az role assignment list \
  --assignee "$PRINCIPAL_ID" \
  --scope "$STORAGE_SCOPE" \
  --output table
```

# AKS 

## Create Kubernetes namespace
```shell
kubectl create namespace $NAMESPACE
```

# Create Kubernetes Service Account
```shell
kubectl create serviceaccount "$SERVICE_ACCOUNT" \
  --namespace "$NAMESPACE"
```

## Annotate Service Account to the managed Identity
* The Annotation links the kubernetes Service account to the managed Identity cleint ID
```shell
kubectl annotate serviceaccount "$SERVICE_ACCOUNT" \
  --namespace "$NAMESPACE" \
  azure.workload.identity/client-id="$CLIENT_ID" \
  --overwrite
```

### Verify
```shell
kubectl describe serviceaccount "$SERVICE_ACCOUNT" \
  --namespace "$NAMESPACE"
```

## Get OIDC Issuer AKS URL 
```shell
AKS_OIDC_ISSUER=$(az aks show \
  --subscription "$SUBSCRIPTION_ID" \
  --resource-group "$RESOURCE_GROUP" \
  --name "$AKS_CLUSTER_NAME" \
  --query "oidcIssuerProfile.issuerUrl" \
  --output tsv)

echo "$AKS_OIDC_ISSUER"
```

## Create Identity Federation 
```shell
az identity federated-credential create \
  --subscription "$SUBSCRIPTION_ID" \
  --name "$FEDERATED_CREDENTIAL_NAME" \
  --identity-name "$IDENTITY_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --issuer "$AKS_OIDC_ISSUER" \
  --subject "system:serviceaccount:$NAMESPACE:$SERVICE_ACCOUNT" \
  --audiences "api://AzureADTokenExchange"
```

### Verify Federation list
```shell
az identity federated-credential list \
  --identity-name "$IDENTITY_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --output table
```

## Create the POD 

```yaml
kubectl apply -f - <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: wi-storage-test
  namespace: "$NAMESPACE"
  labels:
    azure.workload.identity/use: "true"
spec:
  serviceAccountName: "$SERVICE_ACCOUNT"
  containers:
    - name: test
      image: mcr.microsoft.com/azure-cli:2.77.0
      command: ["/bin/sh", "-c"]
      args: ["sleep 3600"]
EOF
```

### Enter into the pod 
```shell
kubectl -n "$NAMESPACE" exec -it pod/wi-storage-test -- /bin/sh
```
### Verify the Azure Tenant ID 

```shell
env | grep AZURE_TENANT_ID
```

### Verify AZURE_FEDERATED_TOKEN_FILE=
```shell
env | grep AZURE_FEDERATED_TOKEN_FILE=
```

## Verify azure client ID 
```shell
env | grep AZURE_CLIENT_ID=
```

Using above values lets login to azure now 

## login to azure 
```shell
az login \
  --service-principal \
  --username "$AZURE_CLIENT_ID" \
  --tenant "$AZURE_TENANT_ID" \
  --federated-token "$(cat "$AZURE_FEDERATED_TOKEN_FILE")" \
  --allow-no-subscriptions \
  --output none
```


## Set the env var 
```shell
STORAGE_ACCOUNT_NAME=workloadidentitysa121
CONTAINER_NAME=workload-identity-demo
```

## Create a container in storage account
```shell
az storage container create \
  --account-name "$STORAGE_ACCOUNT_NAME" \
  --name "$CONTAINER_NAME" \
  --auth-mode login
```

## Create a temp file
```shell
echo "AKS Workload Identity successfully accessed Blob Storage." \
  > /tmp/identity-proof.txt
```

## Upload the file 
```shell
az storage blob upload \
  --account-name "$STORAGE_ACCOUNT_NAME" \
  --container-name "$CONTAINER_NAME" \
  --name identity-proof.txt \
  --file /tmp/identity-proof.txt \
  --auth-mode login \
  --overwrite
```

## List the file 
```shell
az storage blob list \
  --account-name "$STORAGE_ACCOUNT_NAME" \
  --container-name "$CONTAINER_NAME" \
  --auth-mode login \
  --output table
```

## Download the file 
```shell
az storage blob download \
  --account-name "$STORAGE_ACCOUNT_NAME" \
  --container-name "$CONTAINER_NAME" \
  --name identity-proof.txt \
  --file /dev/stdout \
  --auth-mode login
```

