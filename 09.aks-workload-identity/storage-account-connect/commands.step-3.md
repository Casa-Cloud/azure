## Create Kubernetes namespace
## Create Kubernetes Service Account
## Annotate Service Account to the managed Identity
### Verify Annotation
```shell
kubectl create namespace $NAMESPACE
kubectl create serviceaccount "$SERVICE_ACCOUNT" \
  --namespace "$NAMESPACE"
kubectl annotate serviceaccount "$SERVICE_ACCOUNT" \
  --namespace "$NAMESPACE" \
  azure.workload.identity/client-id="$CLIENT_ID" \
  --overwrite
kubectl describe serviceaccount "$SERVICE_ACCOUNT" \
  --namespace "$NAMESPACE"
```
