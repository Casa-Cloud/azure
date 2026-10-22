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
