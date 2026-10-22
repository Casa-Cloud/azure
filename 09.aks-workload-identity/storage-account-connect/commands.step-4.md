## Get OIDC Issuer AKS URL 
## Create Identity Federation 
### Verify Federation list

```shell
AKS_OIDC_ISSUER=$(az aks show \
  --subscription "$SUBSCRIPTION_ID" \
  --resource-group "$RESOURCE_GROUP" \
  --name "$AKS_CLUSTER_NAME" \
  --query "oidcIssuerProfile.issuerUrl" \
  --output tsv)
echo "$AKS_OIDC_ISSUER"
az identity federated-credential create \
  --subscription "$SUBSCRIPTION_ID" \
  --name "$FEDERATED_CREDENTIAL_NAME" \
  --identity-name "$IDENTITY_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --issuer "$AKS_OIDC_ISSUER" \
  --subject "system:serviceaccount:$NAMESPACE:$SERVICE_ACCOUNT" \
  --audiences "api://AzureADTokenExchange"
az identity federated-credential list \
  --identity-name "$IDENTITY_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --output table
```