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

# Test with Node.js

The demo uses `DefaultAzureCredential`. Locally it uses your Azure CLI login. In
AKS, it automatically uses the projected Workload Identity token.

## Run locally

The signed-in developer must have `Storage Blob Data Contributor` on the storage
account or container.

```shell
cd 09.aks-workload-identity/storage-account-connect/nodejs-demo

npm init --yes
npm install @azure/identity @azure/storage-blob

export STORAGE_ACCOUNT_NAME="workloadidentitysa121"
export CONTAINER_NAME="workload-identity-demo"

az login
node index.mjs
```

Expected output includes:

```text
Uploaded node-identity-proof.txt. Blobs in workload-identity-demo:
- identity-proof.txt
- node-identity-proof.txt
Downloaded content: Node.js accessed Blob Storage using AKS Workload Identity.
```

## Run in AKS with Workload Identity

Run these commands from the repository root after loading the variables from
`.env`. The pod uses the existing annotated Kubernetes service account.

```shell
source 09.aks-workload-identity/storage-account-connect/.env

kubectl create configmap node-blob-demo \
  --namespace "$NAMESPACE" \
  --from-file=index.mjs=09.aks-workload-identity/storage-account-connect/nodejs-demo/index.mjs \
  --dry-run=client \
  --output yaml | kubectl apply -f -

kubectl apply -f - <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: node-blob-demo
  namespace: "$NAMESPACE"
  labels:
    azure.workload.identity/use: "true"
spec:
  serviceAccountName: "$SERVICE_ACCOUNT"
  restartPolicy: Never
  containers:
    - name: node
      image: node:22-bookworm-slim
      workingDir: /app
      command: ["/bin/sh", "-c"]
      args:
        - npm init --yes &&
          npm install @azure/identity @azure/storage-blob &&
          cp /demo/index.mjs /app/index.mjs &&
          node /app/index.mjs
      env:
        - name: STORAGE_ACCOUNT_NAME
          value: "$STORAGE_ACCOUNT_NAME"
        - name: CONTAINER_NAME
          value: "workload-identity-demo"
      volumeMounts:
        - name: demo
          mountPath: /demo
          readOnly: true
  volumes:
    - name: demo
      configMap:
        name: node-blob-demo
EOF

kubectl logs --namespace "$NAMESPACE" --follow pod/node-blob-demo
```

No storage key, connection string, client secret, or manual `az login` is needed
inside the Node.js pod.

## Clean up the demo pod

```shell
kubectl delete pod node-blob-demo --namespace "$NAMESPACE"
kubectl delete configmap node-blob-demo --namespace "$NAMESPACE"
```

## Clean up Azure resources

The resource group is dedicated to this demo, so deleting it removes:

- AKS and its managed node resource group
- The storage account, containers, and blobs
- The user-assigned managed identity and federated credential
- Resource-scoped role assignments

```shell
source 09.aks-workload-identity/storage-account-connect/.env

NODE_RESOURCE_GROUP=$(az aks show \
  --subscription "$SUBSCRIPTION_ID" \
  --resource-group "$RESOURCE_GROUP" \
  --name "$AKS_CLUSTER_NAME" \
  --query nodeResourceGroup \
  --output tsv)
echo $NODE_RESOURCE_GROUP

az group delete \
  --subscription "$SUBSCRIPTION_ID" \
  --name "$RESOURCE_GROUP" \
  --yes
```

Verify that Azure removed both resource groups. Each command should return
`false`:

```shell
az group exists \
  --subscription "$SUBSCRIPTION_ID" \
  --name "$RESOURCE_GROUP"

az group exists \
  --subscription "$SUBSCRIPTION_ID" \
  --name "$NODE_RESOURCE_GROUP"
```


