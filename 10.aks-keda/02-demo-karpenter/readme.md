KEDA + Karpenter on AKS — Extended Demo Implementation Plan
Objective: Extend your existing KEDA project to demonstrate complete, demand-driven Kubernetes autoscaling—automatically scaling application pods using KEDA and provisioning additional Azure nodes using Karpenter.

The key advantage is that you don't need to rebuild either Node.js application or change your custom Metrics API. We can reuse the existing solution and introduce node provisioning as the next stage.

One important AKS-specific detail: Microsoft's supported managed implementation of Karpenter is called Node Auto-Provisioning (NAP). For this meetup, I recommend enabling NAP rather than installing and maintaining a standalone Karpenter Helm deployment. AKS manages the underlying Karpenter integration, while you configure node provisioning through Kubernetes resources such as NodePool and AKSNodeClass. 

Microsoft Learn
+1



1. Extended architecture
Your previous demo established this workflow:

Metrics API → KEDA → HPA → Worker Pods

Now extend it to:
End-to-End Autoscaling Architecture
Node.js Metrics Controller

pendingJobs: 100

KEDA Metrics API Scaler

Reads workload demand

Kubernetes HPA

Requests 10 worker replicas

Scheduled Pods

Fit on existing AKS nodes


Pending Pods

Insufficient available node capacity



Karpenter / AKS NAP

Evaluates unschedulable pod requirements

New Azure Node Provisioned

Pending worker pods can now be scheduled


Karpenter reacts to unschedulable pods, not directly to the Metrics API or the pending-jobs value. That's the technical distinction worth emphasizing in your meetup.

2. High-level implementation plan
I would preserve your original KEDA project as Part 1 and add the following phases as Part 2 — Karpenter Integration.
Phase 7 — Prepare the Existing AKS Cluster
17. Verify existing infrastructure
- Confirm the original AKS cluster, KEDA and both Node.js applications are still available.
- Verify the current Kubernetes version and Azure CLI version.
- Check the current system node pool and available node resources.
- Check Azure VM-family quota and regional capacity.
18. Validate Karpenter/NAP prerequisites
- Confirm that the cluster uses managed identity.
- Check cluster networking and other NAP compatibility requirements.
- Check whether Cluster Autoscaler is currently enabled.
- Plan the transition so Cluster Autoscaler and NAP don't compete to manage the same workload capacity.
Microsoft supports enabling NAP on existing compatible AKS clusters. Azure CLI 2.76.0 or later is required. 

Microsoft Learn
+1



Phase 8 — Enable Karpenter on AKS
19. Enable Node Auto-Provisioning

Enable the AKS-managed Karpenter integration using Azure CLI.

The key configuration is:
--node-provisioning-mode Auto


20. Verify installation

Confirm that the following Kubernetes resources are available:
- NodePool
- AKSNodeClass
- NodeClaim
Important: You won't necessarily see a conventional karpenter controller pod in kube-system. With managed AKS NAP, the controller runs in the AKS-managed control plane. 

Microsoft Learn
+1



Phase 9 — Configure Karpenter Node Provisioning
21. Create a dedicated NodePool

For your demonstration, create a provisioning configuration named:

keda-worker-nodepool

Define:
- Allowed Azure VM families or sizes.
- CPU capacity limits.
- Supported architecture (amd64).
- Linux operating system.
- On-demand VM preference.
- Node consolidation policy.
22. Configure AKSNodeClass

Define the relevant Azure-specific settings required by the selected NAP configuration.

23. Validate provisioning configuration

Verify the NodePool is ready and suitable for your worker application's scheduling requirements.

This is where you demonstrate the difference between traditional predefined node pools and demand-driven node provisioning.
Phase 10 — Prepare the Existing Worker for Node Autoscaling
24. Modify only the Worker Deployment

Your existing worker requests are:
resources:
  requests:
    cpu: "100m"
    memory: "128Mi"


These requests are relatively small. Ten replicas may fit on your existing node without requiring Karpenter to provision anything.

For this demo, increase the worker's CPU and memory requests sufficiently to create genuine scheduling pressure.

For example, consider testing with:
resources:
  requests:
    cpu: "750m"
    memory: "512Mi"
  limits:
    cpu: "1000m"
    memory: "1Gi"


These are illustrative values, not guaranteed sizing for your cluster. Check actual node allocatable resources first.

25. Configure workload placement

Add appropriate node-selection constraints or scheduling rules so your worker pods can run on the intended NAP-managed capacity.

Ensure those constraints match your NodePool.

Keep the Metrics Controller available throughout the demo. The controller must not disappear when KEDA scales the worker Deployment down to zero.
Phase 11 — Live KEDA + Karpenter Demonstration
26. Establish the baseline

Start with:
- pendingJobs = 0
- Worker replicas = 0
- Existing baseline node count recorded
- No additional worker capacity required
27. Generate workload demand

Change the metric through your existing Node.js API:
{
  "pendingJobs": 100
}


28. Observe KEDA scaling

KEDA exposes the metric, and HPA requests up to 10 worker replicas.

29. Demonstrate insufficient node capacity

Because the current node capacity cannot accommodate every requested worker pod, some pods remain Pending.

Demonstrate the scheduler reporting insufficient resources.

30. Observe Karpenter provisioning

NAP detects eligible unschedulable pods and determines suitable additional node capacity.

Observe:
- New NodeClaims.
- Azure node provisioning.
- New nodes joining Kubernetes.
- Pending pods becoming scheduled and Ready.
31. Validate end-to-end scaling

Confirm that the worker replicas are distributed across suitable available nodes.

This is the main result of the extended demonstration.
Phase 12 — Scale Down Applications and Infrastructure
32. Reduce the workload

Update the Metrics API:
{
  "pendingJobs": 0
}


33. Observe application scale-down

KEDA eventually reduces the worker Deployment to zero replicas.

34. Observe infrastructure consolidation

After worker pods terminate, NAP can evaluate whether the additional capacity is still required.

Subject to the configured disruption and consolidation policies, eligible underutilized or empty nodes can be removed.

The system node capacity required by AKS remains available.
Phase 13 — Production-Grade Considerations
35. Explain safe autoscaling configurations

Cover:
- Pod resource requests and limits.
- Pod Disruption Budgets.
- Topology spread constraints.
- NodePool resource limits.
- VM-family and availability-zone restrictions.
- Node disruption and consolidation policies.
- Observability and troubleshooting.
- Azure subscription quotas and cost considerations.
This phase helps distinguish a working autoscaling demo from a production architecture.
Phase 14 — Cleanup
36. Remove additional demo resources

Clean up in a controlled sequence:
1. Return the Metrics API value to zero.
2. Verify worker scale-down.
3. Remove the additional worker placement configuration.
4. Remove any dedicated custom NodePool and related provisioning configuration when no workloads depend on them.
5. Clean up remaining NAP-managed nodes before disabling NAP, if you intend to revert the cluster.
6. Delete the dedicated Azure infrastructure when finished.
NAP has specific conditions for safely disabling it, so don't treat disabling the feature as equivalent to simply deleting a Deployment. 

Microsoft Learn
+1




3. Expected live demonstration
For the meetup, I would structure the live demonstration around these observable states:
Step	Pending Jobs	Worker Pod Target	Node Behaviour
Baseline	0	0	Existing nodes only
Initial demand	10	1	Existing capacity used
Growing demand	30	3	Available capacity decreases
High demand	100	10	Some pods become Pending
Karpenter responds	100	10	Additional node capacity provisioned
Scheduling completes	100	10	Pending pods become Ready
Demand disappears	0	0	Worker pods terminate
Consolidation	0	0	Eligible excess nodes can be removed
These are intended demonstration stages, not guaranteed timings or exact intermediate pod counts.