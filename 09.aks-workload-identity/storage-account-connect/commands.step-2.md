## Create Identity
## Get the Client ID of workload Identity
## Get Principal ID 
## Create storage account
## Check Storage Accout Name
## Create Storage Account
## Verify Storage Account
## Provide Blob storage Contributor RBAC to Identity
## Verify RBAC

```bash
az identity create \
--resource-group $RESOURCE_GROUP \
--name $IDENTITY_NAME
CLIENT_ID=$(az identity show \
  --subscription "$SUBSCRIPTION_ID" \
  --resource-group "$RESOURCE_GROUP" \
  --name "$IDENTITY_NAME" \
  --query clientId \
  --output tsv)
echo $CLIENT_ID
PRINCIPAL_ID=$(az identity show \
  --subscription "$SUBSCRIPTION_ID" \
  --resource-group "$RESOURCE_GROUP" \
  --name "$IDENTITY_NAME" \
  --query principalId \
  --output tsv)
echo "$PRINCIPAL_ID"
az storage account check-name \
  --name "$STORAGE_ACCOUNT_NAME"
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
STORAGE_SCOPE=$(az storage account show \
  --subscription "$SUBSCRIPTION_ID" \
  --resource-group "$RESOURCE_GROUP" \
  --name "$STORAGE_ACCOUNT_NAME" \
  --query id \
  --output tsv)
echo "$STORAGE_SCOPE"
az role assignment create \
  --assignee-object-id "$PRINCIPAL_ID" \
  --assignee-principal-type ServicePrincipal \
  --role "Storage Blob Data Contributor" \
  --scope "$STORAGE_SCOPE"
az role assignment list \
  --assignee "$PRINCIPAL_ID" \
  --scope "$STORAGE_SCOPE" \
  --output table
```