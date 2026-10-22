
### Enter into the pod 

```shell
kubectl -n "$NAMESPACE" exec -it pod/wi-storage-test -- /bin/sh
```

### Verify the Azure Tenant ID 
### Verify AZURE_FEDERATED_TOKEN_FILE
## Verify azure client ID
```shell
env | grep AZURE_TENANT_ID
env | grep AZURE_FEDERATED_TOKEN_FILE=
env | grep AZURE_CLIENT_ID=
```

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


