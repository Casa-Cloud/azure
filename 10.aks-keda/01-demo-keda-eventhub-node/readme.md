# KEDA on AKS — Demo Implementation Plan

**Objective:** Build a custom Node.js Metrics API and use KEDA to automatically scale AKS worker pods from 0 to 10 based on the API response.

## Phase 1 — Azure Infrastructure

1. **Create Resource Group**
   - Create a dedicated Azure resource group for the demo.

2. **Create Azure Container Registry (ACR)**
   - Store the Node.js application container images.

3. **Create AKS Cluster**
   - Provision AKS with KEDA enabled using the `--enable-keda` flag.
   - Attach Azure Container Registry (ACR).

4. **Verify KEDA Installation**
   - Ensure the KEDA Operator and Metrics Adapter are running successfully.

## Phase 2 — Build Node.js Applications

5. **Build Metrics Controller API**
   - Create a Node.js Express application.
   - Expose `GET /api/metrics` to retrieve the current metric.
   - Expose `POST /api/metrics` to update the metric value.

6. **Build Worker API**
   - Create a lightweight Node.js application.
   - Expose `/` and `/health` endpoints.

7. **Create Docker Images**
   - Containerize both Node.js applications using Dockerfiles.

8. **Push Images to ACR**
   - Build, tag, and push both container images to Azure Container Registry.

## Phase 3 — Kubernetes Deployments

9. **Deploy Metrics Controller**
   - Deploy the Metrics API with one replica.
   - Expose it using an internal Kubernetes ClusterIP Service.

10. **Deploy Worker API**
    - Create a Kubernetes Deployment for the worker application.
    - Configure appropriate CPU and memory resource requests.

11. **Verify Applications**
    - Confirm both applications are running.
    - Verify that the Metrics API is accessible within the AKS cluster.

## Phase 4 — KEDA Configuration

12. **Create KEDA ScaledObject**
    - Configure KEDA's `metrics-api` scaler.
    - Point it to the Node.js Metrics API endpoint.

13. **Configure Scaling Rules**
    - `minReplicaCount: 0`
    - `maxReplicaCount: 10`
    - `pollingInterval: 10`
    - `cooldownPeriod: 60`
    - `targetValue: 10`

14. **Verify KEDA and HPA**
    - Confirm the ScaledObject is configured correctly.
    - Verify that KEDA has generated an HPA.
    - Ensure the Worker Deployment is ready for autoscaling.

## Phase 5 — Live Autoscaling Demonstration

15. **Demonstrate Dynamic Pod Scaling**
    - Update the metric through the Node.js API.
    - Observe the corresponding worker replica targets.

    | Metric Value | Target Worker Replicas |
    |--------------|------------------------|
    | 0            | 0                      |
    | 10           | 1                      |
    | 30           | 3                      |
    | 50           | 5                      |
    | 100          | 10                     |
    | 0            | 0 (after cooldown)     |

    **Monitor Scaling:**

    ```bash
    kubectl get pods -w
    kubectl get hpa -w
    kubectl get scaledobject
    ```

    **Expected Behaviour:**
    - Increasing the metric increases the worker replica count.
    - Decreasing the metric reduces the worker replica count.
    - Setting the metric to zero eventually scales all worker pods to zero.
    - The Metrics Controller remains running to support future scaling.

## Phase 6 — Cleanup

16. **Remove Demo Resources**
    - Delete Kubernetes Deployments, Services, and ScaledObjects.
    - Delete the Azure resource group and associated infrastructure.
    - Ensure no unnecessary Azure resources remain running.

---

## Expected Outcome

Demonstrate how KEDA automatically scales Kubernetes worker pods based on custom metrics exposed by a Node.js REST API, without relying on CPU utilization, message queues, or external monitoring systems.

**Note:** Replica counts are illustrative steady-state targets. Actual scaling timing depends on KEDA polling intervals, Kubernetes HPA behaviour, and cooldown settings.
