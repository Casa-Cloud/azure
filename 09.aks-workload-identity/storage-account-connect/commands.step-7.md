
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
  --file tmp/downloaded-proof.txt \
  --auth-mode login
```

## Verify Downloaded File
```shell
cat tmp/downloaded-proof.txt 
```