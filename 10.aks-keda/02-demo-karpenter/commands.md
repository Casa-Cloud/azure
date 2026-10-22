# KEDA + Karpenter on AKS — Demo Implementation Plan (Part 2)

## Objective

Extend the existing KEDA demo to demonstrate end-to-end automated Kubernetes scaling:

1. KEDA detects workload demand through the custom Node.js Metrics API.
2. HPA adjusts the desired number of worker pods.
3. Kubernetes attempts to schedule the new pods.
4. Unschedulable pods trigger Karpenter / AKS Node Auto-Provisioning (NAP).
5. NAP provisions suitable Azure nodes.
6. Kubernetes schedules the pending pods.
7. When demand disappears, KEDA scales worker pods to zero.
8. NAP consolidates eligible unused node capacity.

> This demo uses AKS-managed Karpenter, called Node Auto-Provisioning (NAP), rather than installing a standalone Karpenter Helm chart.

---

To import all the vars from .env 
# Phase 1 — Azure Infrastructure
## Login To Azure
```shell
az login
```

## To import all the vars from .env 
```shell
cd 10.aks-keda/01-demo-keda-eventhub-node
source ./.env
```

## Check all ENV vars 
```shell
echo "SUBSCRIPTION_ID               = $SUBSCRIPTION_ID"
echo "RESOURCE_GROUP                = $RESOURCE_GROUP"
echo "LOCATION                      = $LOCATION"
echo "AKS_CLUSTER_NAME              = $AKS_CLUSTER_NAME"
echo "NAMESPACE                     = $NAMESPACE"
echo "ACR_NAME                      = $ACR_NAME"
echo "ACR_LOGIN_SERVER              = $ACR_LOGIN_SERVER"
echo "IMAGE_TAG                     = $IMAGE_TAG"
echo "IMAGE_TAG_KEDA_WORKER_SERVICE = $IMAGE_TAG_KEDA_WORKER_SERVICE"
```

## Step 19 — Retrieve AKS Credentials

```bash
az aks get-credentials \
  --subscription "$SUBSCRIPTION_ID" \
  --resource-group "$RESOURCE_GROUP" \
  --name "$AKS_CLUSTER_NAME" \
  --overwrite-existing
```

Verify the active context:

```bash
kubectl config current-context
kubectl get nodes -o wide
```

## Step 20 — Validate NAP Compatibility

```bash
az aks show \
  --subscription "$SUBSCRIPTION_ID" \
  --resource-group "$RESOURCE_GROUP" \
  --name "$AKS_CLUSTER_NAME" \
  --query "{
    Name:name,
    KubernetesVersion:kubernetesVersion,
    Identity:identity.type,
    NetworkPlugin:networkProfile.networkPlugin,
    NetworkPluginMode:networkProfile.networkPluginMode,
    NetworkDataplane:networkProfile.networkDataplane,
    OutboundType:networkProfile.outboundType,
    Provisioning:nodeProvisioningProfile.mode,
    State:provisioningState
  }" \
  -o json
```

Before enabling NAP:

- Confirm the current cluster meets Microsoft's NAP networking requirements.
- Confirm it uses managed identity.
- Verify the Kubernetes version is supported.
- Verify regional Azure VM quota.
- Review compatibility with the existing node pools.

**Important:** Do not enable NAP until these prerequisites are confirmed. An incompatible existing AKS cluster might require a replacement cluster.

Reference: https://learn.microsoft.com/en-us/azure/aks/node-auto-provisioning

## Step 21 — Verify Existing Node Pools

```bash
az aks nodepool list \
  --subscription "$SUBSCRIPTION_ID" \
  --resource-group "$RESOURCE_GROUP" \
  --cluster-name "$AKS_CLUSTER_NAME" \
  --query "[].{
    Name:name,
    Mode:mode,
    VMSize:vmSize,
    Count:count,
    Autoscaling:enableAutoScaling,
    Min:minCount,
    Max:maxCount
  }" \
  -o table
```

Identify whether Cluster Autoscaler is currently enabled.

## Step 22 — Verify the Existing KEDA Demo

```bash
kubectl get deployments -n "$NAMESPACE"
kubectl get services -n "$NAMESPACE"
kubectl get scaledobjects -n "$NAMESPACE"
kubectl get hpa -n "$NAMESPACE"
kubectl get pods -n "$NAMESPACE" -o wide
```

Verify that:

- `keda-metrics-controller` is healthy.
- `keda-worker-service` exists.
- `keda-worker-scaler` is configured.
- KEDA can communicate with the Metrics API.

## Step 23 — Back Up the Existing Configurations

```bash
kubectl get deployment keda-worker-service \
  -n "$NAMESPACE" -o yaml > worker-before-nap.yaml

kubectl get scaledobject keda-worker-scaler \
  -n "$NAMESPACE" -o yaml > scaler-before-nap.yaml
```

These files provide a reference for restoring the previous configuration.

---

# Phase 8 — Enable Karpenter on AKS

## Step 24 — Reset the Metrics API

Start port forwarding:

```bash
kubectl port-forward \
  -n "$NAMESPACE" \
  svc/keda-metrics-controller \
  9001:9001
```

In another terminal:

```bash
curl -fsS -X POST \
  http://localhost:9001/api/metrics \
  -H "Content-Type: application/json" \
  -d '{"pendingJobs":0}'
```

Wait until the worker Deployment reaches zero replicas.

## Step 25 — Handle Existing Cluster Autoscaler

If Cluster Autoscaler is enabled on an existing node pool, plan its migration or disable it for this dedicated demo.

For a pool where it is enabled:

```bash
az aks nodepool update \
  --subscription "$SUBSCRIPTION_ID" \
  --resource-group "$RESOURCE_GROUP" \
  --cluster-name "$AKS_CLUSTER_NAME" \
  --name <EXISTING_POOL_NAME> \
  --disable-cluster-autoscaler
```

Replace `<EXISTING_POOL_NAME>` with the actual pool name.

**Do not blindly disable Cluster Autoscaler on a shared production cluster.**

## Step 26 — Enable Node Auto-Provisioning

After all compatibility checks pass:

```bash
az aks update \
  --subscription "$SUBSCRIPTION_ID" \
  --resource-group "$RESOURCE_GROUP" \
  --name "$AKS_CLUSTER_NAME" \
  --node-provisioning-mode Auto
```

## Step 27 — Verify NAP Is Enabled

```bash
az aks show \
  --subscription "$SUBSCRIPTION_ID" \
  --resource-group "$RESOURCE_GROUP" \
  --name "$AKS_CLUSTER_NAME" \
  --query "nodeProvisioningProfile" \
  -o json
```

Expected mode:

```json
{
  "mode": "Auto"
}
```

## Step 28 — Verify Karpenter Kubernetes Resources

```bash
kubectl get crds | grep -E 'karpenter|aksnodeclass'

kubectl get nodepools

kubectl get aksnodeclasses

kubectl get nodeclaims
```

NAP should install the relevant Kubernetes custom resources and create the default provisioning configuration.

> An empty NodeClaim list at this stage is normal. NodeClaims appear when additional capacity is requested.

---

# Phase 9 — Configure a Dedicated Karpenter NodePool

## Step 29 — Create AKSNodeClass

Resource name: `keda-worker-nodeclass`.

```bash
kubectl apply -f - <<EOF
apiVersion: karpenter.azure.com/v1beta1
kind: AKSNodeClass
metadata:
  name: keda-worker-nodeclass
spec:
  imageFamily: Ubuntu
  osDiskSizeGB: 128
EOF
```

Verify:

```bash
kubectl get aksnodeclass keda-worker-nodeclass -o yaml
```

Check the installed AKSNodeClass CRD schema if the managed NAP version differs from this example.

## Step 30 — Create a Dedicated NodePool

Resource name: `keda-worker-nodepool`.

The configuration below uses:

- Linux nodes.
- AMD64 architecture.
- On-demand capacity.
- Azure D-series VM family.
- Dedicated workload labels and taints.
- CPU and memory capacity limits.
- Empty-node consolidation.

```bash
kubectl apply -f - <<EOF
apiVersion: karpenter.sh/v1
kind: NodePool
metadata:
  name: keda-worker-nodepool
spec:
  template:
    metadata:
      labels:
        workload: keda-demo
    spec:
      nodeClassRef:
        group: karpenter.azure.com
        kind: AKSNodeClass
        name: keda-worker-nodeclass

      taints:
        - key: dedicated
          value: keda-demo
          effect: NoSchedule

      requirements:
        - key: kubernetes.io/arch
          operator: In
          values:
            - amd64

        - key: kubernetes.io/os
          operator: In
          values:
            - linux

        - key: karpenter.sh/capacity-type
          operator: In
          values:
            - on-demand

        - key: karpenter.azure.com/sku-family
          operator: In
          values:
            - D

  limits:
    cpu: "16"
    memory: 64Gi

  disruption:
    consolidationPolicy: WhenEmpty
    consolidateAfter: 60s
EOF
```

> NodePool limits apply to the aggregate capacity provisioned by the NodePool, not to an individual worker pod.

Before applying, verify that the D-series requirement is available in your region and that the installed CRD supports the example's API version and property names.

## Step 31 — Verify NodePool Configuration

```bash
kubectl get nodepools

kubectl describe nodepool keda-worker-nodepool

kubectl get aksnodeclasses

kubectl get nodeclaims
```

Confirm that `keda-worker-nodepool` and `keda-worker-nodeclass` are Ready.

No additional node is necessarily created until a workload requires its capacity.

---

# Phase 10 — Prepare the Worker Deployment

## Step 32 — Increase Worker Resource Requests

Original configuration:

```yaml
resources:
  requests:
    cpu: "100m"
    memory: "128Mi"
  limits:
    cpu: "500m"
    memory: "512Mi"
```

Updated configuration for the demonstration:

```yaml
resources:
  requests:
    cpu: "750m"
    memory: "512Mi"
  limits:
    cpu: "1000m"
    memory: "1Gi"
```

These are illustrative resource settings. Actual node provisioning depends on available node capacity, quotas and scheduling constraints.

## Step 33 — Update Worker Scheduling Requirements

Ensure the current metric is zero and the worker has scaled down.

Apply the following strategic merge patch:

```bash
kubectl patch deployment keda-worker-service \
  -n "$NAMESPACE" \
  --type='strategic' \
  -p '{
    "spec": {
      "template": {
        "spec": {
          "nodeSelector": {
            "workload": "keda-demo"
          },
          "tolerations": [
            {
              "key": "dedicated",
              "operator": "Equal",
              "value": "keda-demo",
              "effect": "NoSchedule"
            }
          ],
          "containers": [
            {
              "name": "keda-worker-service",
              "resources": {
                "requests": {
                  "cpu": "750m",
                  "memory": "512Mi"
                },
                "limits": {
                  "cpu": "1000m",
                  "memory": "1Gi"
                }
              }
            }
          ]
        }
      }
    }
  }'
```

### Explanation

| Configuration | Purpose |
|---|---|
| nodeSelector | Requires nodes labeled `workload=keda-demo` |
| tolerations | Allows workers to run on dedicated Karpenter nodes |
| CPU request | Defines the worker's scheduling CPU requirement |
| Memory request | Defines its scheduling memory requirement |
| CPU/memory limits | Defines container runtime resource limits |

Do not add the demo label to your existing AKS system node.

## Step 34 — Validate the Updated Worker Deployment

```bash
kubectl get deployment keda-worker-service \
  -n "$NAMESPACE" -o yaml
```

Check:

- Resource requests.
- Resource limits.
- Node selector.
- Tolerations.
- Existing container image.
- Existing health probes.

Verify the ScaledObject remains configured:

```bash
kubectl get scaledobject keda-worker-scaler \
  -n "$NAMESPACE"
```

---

# Phase 11 — Live KEDA + Karpenter Autoscaling

## Step 35 — Open Monitoring Terminals

### Terminal 1 — Watch Worker Pods

```bash
kubectl get pods \
  -n "$NAMESPACE" \
  -l app=keda-worker-service \
  -o wide -w
```

### Terminal 2 — Watch HPA

```bash
kubectl get hpa -n "$NAMESPACE" -w
```

### Terminal 3 — Watch AKS Nodes

```bash
kubectl get nodes -w
```

### Terminal 4 — Watch Karpenter NodeClaims

```bash
kubectl get nodeclaims -w
```

## Step 36 — Start Metrics Controller Port Forwarding

### Terminal 5

```bash
kubectl port-forward \
  -n "$NAMESPACE" \
  svc/keda-metrics-controller \
  9001:9001
```

Keep this terminal running.

## Step 37 — Establish Baseline

Set the workload metric to zero:

```bash
curl -fsS -X POST \
  http://localhost:9001/api/metrics \
  -H "Content-Type: application/json" \
  -d '{"pendingJobs":0}'
```

Verify:

```bash
curl -fsS http://localhost:9001/api/metrics
```

Check the Deployment:

```bash
kubectl get deployment keda-worker-service -n "$NAMESPACE"
```

Expected steady-state worker count: zero.

## Step 38 — Generate Initial Demand

Set pending jobs to 10:

```bash
curl -fsS -X POST \
  http://localhost:9001/api/metrics \
  -H "Content-Type: application/json" \
  -d '{"pendingJobs":10}'
```

With `targetValue: "10"`, the expected steady-state target is approximately one worker replica.

Because the worker requires our dedicated NodePool, Kubernetes might initially report it as Pending.

Karpenter should then evaluate that scheduling requirement.

Watch:

```bash
kubectl get pods -n "$NAMESPACE" -o wide -w
```

```bash
kubectl get nodeclaims -w
```

```bash
kubectl get nodes -w
```

## Step 39 — Increase Workload Demand

Set pending jobs to 100:

```bash
curl -fsS -X POST \
  http://localhost:9001/api/metrics \
  -H "Content-Type: application/json" \
  -d '{"pendingJobs":100}'
```

Expected steady-state worker target:

```text
100 / 10 = 10 worker replicas
```

KEDA/HPA requests additional worker pods.

Kubernetes schedules pods where compatible capacity is available.

NAP evaluates eligible unschedulable pods and provisions additional nodes when needed.

## Step 40 — Inspect Karpenter Provisioning

List NodeClaims:

```bash
kubectl get nodeclaims
```

Inspect a specific NodeClaim:

```bash
kubectl describe nodeclaim <NODECLAIM_NAME>
```

Inspect the NodePool:

```bash
kubectl describe nodepool keda-worker-nodepool
```

Inspect Kubernetes events:

```bash
kubectl get events -A --sort-by=.lastTimestamp
```

Inspect worker pod scheduling events:

```bash
kubectl describe pods \
  -n "$NAMESPACE" \
  -l app=keda-worker-service
```

Look for:

- Insufficient node capacity.
- Pod scheduling requirements.
- NodeClaim creation.
- New node registration.
- Successful pod scheduling.

## Step 41 — Verify Worker Pod Placement

```bash
kubectl get pods \
  -n "$NAMESPACE" \
  -l app=keda-worker-service \
  -o wide
```

List the dedicated Karpenter nodes:

```bash
kubectl get nodes \
  -l karpenter.sh/nodepool=keda-worker-nodepool \
  -o wide
```

Confirm the worker pods are running on the provisioned nodes.

---

# Phase 12 — Demonstrate Scale-Down

## Step 42 — Reduce Pending Jobs to Zero

```bash
curl -fsS -X POST \
  http://localhost:9001/api/metrics \
  -H "Content-Type: application/json" \
  -d '{"pendingJobs":0}'
```

Verify:

```bash
curl -fsS http://localhost:9001/api/metrics
```

## Step 43 — Monitor Worker Scale-Down

```bash
kubectl get deployment keda-worker-service \
  -n "$NAMESPACE" -w
```

Expected eventual state:

```text
Worker Deployment: 0/0
```

Actual timing depends on KEDA polling, cooldown and HPA behavior.

## Step 44 — Monitor Node Consolidation

```bash
kubectl get nodeclaims -w
```

```bash
kubectl get nodes -w
```

With the example disruption configuration:

```yaml
disruption:
  consolidationPolicy: WhenEmpty
  consolidateAfter: 60s
```

Karpenter can consolidate eligible empty nodes, subject to its disruption and termination safeguards.

The existing AKS system node capacity remains available.

---

# Phase 13 — Restore the Original Worker Configuration

## Step 45 — Remove Dedicated Scheduling Constraints

Only use this patch if the node selector and tolerations were introduced exclusively for this demo and did not previously exist.

```bash
kubectl patch deployment keda-worker-service \
  -n "$NAMESPACE" \
  --type=json \
  -p='[
    {
      "op": "remove",
      "path": "/spec/template/spec/nodeSelector"
    },
    {
      "op": "remove",
      "path": "/spec/template/spec/tolerations"
    }
  ]'
```

If those fields previously contained other settings, restore their original values using the backup instead.

## Step 46 — Restore Original Resource Requests

```bash
kubectl set resources deployment/keda-worker-service \
  -n "$NAMESPACE" \
  --containers=keda-worker-service \
  --requests=cpu=100m,memory=128Mi \
  --limits=cpu=500m,memory=512Mi
```

Verify:

```bash
kubectl get deployment keda-worker-service \
  -n "$NAMESPACE" -o yaml
```

---

# Phase 14 — Cleanup

## Step 47 — Verify Dedicated Capacity Has Consolidated

```bash
kubectl get nodeclaims \
  -l karpenter.sh/nodepool=keda-worker-nodepool
```

```bash
kubectl get nodes \
  -l karpenter.sh/nodepool=keda-worker-nodepool
```

Ensure no active workload depends on this dedicated NodePool.

## Step 48 — Remove Custom NodePool

Once the NodePool has no remaining managed nodes or NodeClaims:

```bash
kubectl delete nodepool keda-worker-nodepool
```

## Step 49 — Remove Custom AKSNodeClass

```bash
kubectl delete aksnodeclass keda-worker-nodeclass
```

Leave the AKS default NAP configuration intact unless you are deliberately reverting the feature.

## Step 50 — Final Verification

```bash
kubectl get nodepools
kubectl get nodeclaims
kubectl get nodes
kubectl get deployments -n "$NAMESPACE"
kubectl get scaledobjects -n "$NAMESPACE"
```

**Important:** Disabling NAP entirely requires the documented migration procedure. Do not switch it to Manual while it still manages active node capacity.

---

# Expected Demo Results

| Stage | Pending Jobs | Worker Pods | Infrastructure Behavior |
|---|---:|---:|---|
| Baseline | 0 | 0 | Existing capacity only |
| Initial demand | 10 | 1 | Karpenter evaluates scheduling |
| Increased demand | 30 | 3 | Worker capacity increases |
| High demand | 100 | 10 | Additional nodes provisioned as required |
| Scheduling complete | 100 | Up to 10 Ready | Pods run on suitable nodes |
| Demand disappears | 0 | Eventually 0 | Workers terminate |
| Consolidation | 0 | 0 | Eligible additional nodes removed |

*Replica counts are illustrative steady-state targets. Actual behavior depends on KEDA, HPA, Kubernetes scheduling, Azure quotas and Karpenter provisioning policies.*

---

# Final Architecture

```text
                   USER
                    |
                    | POST /api/metrics
                    | {"pendingJobs":100}
                    v
        +---------------------------+
        | Node.js Metrics Controller|
        | Replicas: 1               |
        +---------------------------+
                    |
                    | GET /api/metrics
                    v
        +---------------------------+
        | KEDA Metrics API Scaler   |
        +---------------------------+
                    |
                    | External metric
                    v
        +---------------------------+
        | Kubernetes HPA            |
        | Desired Pods: 10          |
        +---------------------------+
                    |
                    v
        +---------------------------+
        | Worker Deployment         |
        | 10 Desired Replicas       |
        +---------------------------+
                    |
           +--------+--------+
           |                 |
           v                 v
    Scheduled Pods       Pending Pods
                             |
                             v
                    +------------------+
                    | Karpenter / NAP  |
                    +------------------+
                             |
                             v
                    +------------------+
                    | New Azure Nodes  |
                    +------------------+
                             |
                             v
                    Pending Pods Scheduled


               SCALE-DOWN WORKFLOW

           pendingJobs = 0
                  |
                  v
             KEDA / HPA
                  |
                  v
           Worker Pods = 0
                  |
                  v
       Empty Provisioned Capacity
                  |
                  v
        Karpenter Consolidation
                  |
                  v
         Eligible Nodes Removed
```

---

# Final Takeaway

**KEDA automates application scaling.**

**Karpenter automates infrastructure provisioning.**

Together, they enable demand-driven scaling across both application and infrastructure layers on Azure Kubernetes Service.

Official documentation:

https://learn.microsoft.com/en-us/azure/aks/node-auto-provisioning
