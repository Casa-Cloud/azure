# Blob Storage blobFuse2

## Step 0 Verify the Blob CSI driver is installed and registered
```bash
kubectl -n kube-system get pods -l app.kubernetes.io/part-of=blob-csi-driver -o wide
No resources found in kube-system namespace.
```

This means that Blob CSI driver is not available.. 

## Lets check which drivers are available. 
```bash
kubectl get csidriver
```

```bash
kubectl get csidriver
NAME                 ATTACHREQUIRED   PODINFOONMOUNT   STORAGECAPACITY   TOKENREQUESTS                REQUIRESREPUBLISH   MODES                  AGE
disk.csi.azure.com   true             false            false             <unset>                      false               Persistent             9d
file.csi.azure.com   false            true             false             api://AzureADTokenExchange   false               Persistent,Ephemeral   9d
```

As you see blob.csi.azure.com is not available by default.

## Check Same using AZ command
```bash
az aks show -g resource-group-4 -n aks1 \
  --query addonProfiles.azureblobCsiDriver -o table
```

Output:- blank

## Enable the addon 
```bash
az aks update \
  --resource-group resource-group-4 \
  --name aks1 \
  --enable-blob-driver
```
Wait ~1–2 minutes, then verify the driver pods and the CSIDriver object:

## Verify again 
```bash
# You should now see the driver registered
kubectl get csidriver blob.csi.azure.com
```
Output:-
```bash
kubectl get csidriver blob.csi.azure.com
NAME                 ATTACHREQUIRED   PODINFOONMOUNT   STORAGECAPACITY   TOKENREQUESTS                REQUIRESREPUBLISH   MODES                  AGE
blob.csi.azure.com   false            true             false             api://AzureADTokenExchange   false               Persistent,Ephemeral   2m25s
```

## Verify Pods for this blob storage is running
```bash
# And the controller/node pods running
 kubectl get sc | egrep 'azureblob-(fuse|nfs)-premium'
azureblob-fuse-premium   blob.csi.azure.com   Delete          Immediate              true                   3m42s
azureblob-nfs-premium    blob.csi.azure.com   Delete          Immediate              true                   3m42s
```


## Step 1: Create Storage Account
Pick a globally-unique name (lowercase, letters/numbers). Then run:

```bash
# --- setup ---
export RG_NAME=myStorageDemoRG
export LOCATION=eastus

# storage account names must be 3-24 chars, lowercase letters/numbers, globally unique
export STORAGE_ACCOUNT_NAME=demrrrragt123
export SKU=Premium_LRS
export KIND=StorageV2

# --- create RG (if needed) ---
az group create --name "$RG_NAME" --location "$LOCATION"

# --- create storage account ---
az storage account create \
  --name "$STORAGE_ACCOUNT_NAME" \
  --resource-group "$RG_NAME" \
  --sku "$SKU" \
  --kind "$KIND" \
  --location "$LOCATION" \
  --https-only true

echo "Storage account $STORAGE_ACCOUNT_NAME created"

# --- fetch key and create K8s secret (for BlobFuse2 path) ---
STORAGE_KEY=$(az storage account keys list -g "$RG_NAME" -n "$STORAGE_ACCOUNT_NAME" --query "[0].value" -o tsv)

kubectl create ns demo-azureblob 2>/dev/null || true
kubectl -n demo-azureblob create secret generic blob-secret \
  --from-literal=azurestorageaccountname="$STORAGE_ACCOUNT_NAME" \
  --from-literal=azurestorageaccountkey="$STORAGE_KEY"

echo "Kubernetes secret blob-secret created in namespace demo-azureblob"

```

Output:- 
```bash

zsh: invalid mode specification
namespace/demo-azureblob created
secret/blob-secret created
Kubernetes secret blob-secret created in namespace demo-azureblob
```

## Check if secret is created
```bash
azure % kubectl -n demo-azureblob get secret blob-secret -o yaml

apiVersion: v1
data:
  azurestorageaccountkey: czM0aGtMSk5lb1A0RHlha1ZDb213QUk3Mjk4cWt1bitBU3QwTGZnR0E9PQ==
  azurestorageaccountname: ZGVtcndDEyMw==
kind: Secret
metadata:
  creationTimestamp: "2025-11-09T17:25:41Z"
  name: blob-secret
  namespace: demo-azureblob
  resourceVersion: "3619214"
  uid: 545a654a-6123-4460-b672-5df7ed13ff68
type: Opaque
```

## Step 2 — Create StorageClass
01-sc-azureblob-fuse2.yaml
```yaml
# sc-azureblob-fuse2.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: azureblob-fuse2
provisioner: blob.csi.azure.com
parameters:
  protocol: fuse2                   # Blobfuse2 user-space mount
  containerName: fuse2-demo         # optional; if omitted, CSI creates a per-PVC container
  # ---- wire in your secret (must exist already in the *same values* below) ----
  csi.storage.k8s.io/provisioner-secret-name: blob-secret
  csi.storage.k8s.io/provisioner-secret-namespace: demo-azureblob
  csi.storage.k8s.io/node-stage-secret-name: blob-secret
  csi.storage.k8s.io/node-stage-secret-namespace: demo-azureblob
  csi.storage.k8s.io/node-publish-secret-name: blob-secret
  csi.storage.k8s.io/node-publish-secret-namespace: demo-azureblob
reclaimPolicy: Delete
volumeBindingMode: Immediate
allowVolumeExpansion: true
```

```bash 
kubectl apply -f 07-aks-storage/03-blob-storage/BlobFuse2-blob-storage/01-sc-azureblob-fuse2.yaml
kubectl get sc azureblob-fuse2
kubectl -n demo-azureblob get secret blob-secret
```

```bash
kubectl get sc azureblob-fuse2
NAME              PROVISIONER          RECLAIMPOLICY   VOLUMEBINDINGMODE   ALLOWVOLUMEEXPANSION   AGE
azureblob-fuse2   blob.csi.azure.com   Delete          Immediate           true                   21s
```

## Step 3 — Create PersistentVolumeClaim

02-pvc-azureblob-fuse2.yaml

```bash
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: pvc-azureblob-fuse2
  namespace: demo-azureblob
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: azureblob-fuse2
  resources:
    requests:
      storage: 20Gi
```

```bash
kubectl apply -f 07-aks-storage/03-blob-storage/BlobFuse2-blob-storage/02-pvc-azureblob-fuse2.yaml
kubectl -n demo-azureblob get pvc pvc-azureblob-fuse2
```

```bash
kubectl -n demo-azureblob get pvc pvc-azureblob-fuse2
NAME                  STATUS    VOLUME   CAPACITY   ACCESS MODES   STORAGECLASS      VOLUMEATTRIBUTESCLASS   AGE
pvc-azureblob-fuse2   Pending                                      azureblob-fuse2   <unset>                 6s
```

# Step 4 — Deploy Test Pod

Now let’s mount the Blob storage inside a simple BusyBox container and verify it works.
03-blob-writer.yaml

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: blob-writer
  namespace: demo-azureblob
spec:
  replicas: 2
  selector:
    matchLabels:
      app: blob-writer
  template:
    metadata:
      labels:
        app: blob-writer
    spec:
      containers:
        - name: writer
          image: busybox:1.36
          command: ["/bin/sh", "-c"]
          args:
            - |
              while true; do
                echo "$(date) pod=${HOSTNAME}" >> /mnt/blob/hello.txt
                sleep 2
              done
          volumeMounts:
            - name: data
              mountPath: /mnt/blob
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: pvc-azureblob-fuse2
```

```bash
kubectl apply -f 07-aks-storage/03-blob-storage/BlobFuse2-blob-storage/03-blob-writer.yaml
kubectl -n demo-azureblob get pods -l app=blob-writer -o wide

```

```bash
 kubectl -n demo-azureblob get pods -l app=blob-writer -o wide
NAME                           READY   STATUS    RESTARTS   AGE   IP            NODE                                NOMINATED NODE   READINESS GATES
blob-writer-6fcc44c957-rns9m   1/1     Running   0          77s   10.244.2.33   aks-nodepool1-11014092-vmss000000   <none>           <none>
blob-writer-6fcc44c957-whdc9   1/1     Running   0          76s   10.244.2.34   aks-nodepool1-11014092-vmss000000   <none>           <none>
alokadhao@192 azure % kubectl -n demo-azureblob exec -it deploy/blob-writer -- tail -n 20 /mnt/blob/hello.txt

Mon Nov 10 03:05:34 UTC 2025 pod=blob-writer-6fcc44c957-rns9m
Mon Nov 10 03:05:35 UTC 2025 pod=blob-writer-6fcc44c957-whdc9
Mon Nov 10 03:05:36 UTC 2025 pod=blob-writer-6fcc44c957-rns9m
Mon Nov 10 03:05:37 UTC 2025 pod=blob-writer-6fcc44c957-whdc9
Mon Nov 10 03:05:38 UTC 2025 pod=blob-writer-6fcc44c957-rns9m
```

