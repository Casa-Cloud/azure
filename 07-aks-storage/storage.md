

## Storage Categories
| **Category**                                | **Typical Azure Service(s)**                                    | **Access Mode Characteristics**                                                                                               |
| ------------------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **Block / Disk-based Storage**              | Azure Disk (Managed Disks)                                      | Usually **ReadWriteOnce (RWO)** — can be mounted by only one node at a time. Ideal for **stateful workloads** like databases. |
| **File (Shared File) Storage**              | Azure Files (SMB / NFS share)                                   | Supports **ReadWriteMany (RWX)** — multiple pods or nodes can share files. Perfect for **shared content or config**.          |
| **Object / Blob Storage**                   | Azure Blob Storage via CSI driver (BlobFuse, NFS)               | Used for **unstructured data** such as logs, images, and backups. Mounted as a **file-system view** over blob store.          |
| **Ephemeral / Local Storage**               | Node local SSD / NVMe (or ephemeral OS disk)                    | **Fast but temporary.** Data tied to the node lifecycle; lost if the pod or node is deleted.                                  |
| **Specialized / External Storage Services** | Azure NetApp Files, Azure Elastic SAN, third-party integrations | High-performance, scalable, enterprise-grade options for **large-scale or specialized workloads.**                            |

## Storage Account type:-
| **Name**                  | **Provisioner**      | **Reclaim Policy** | **Volume Binding Mode** | **Allow Volume Expansion** | **Age** |
| ------------------------- | -------------------- | ------------------ | ----------------------- | -------------------------- | ------- |
| **azurefile**             | `file.csi.azure.com` | Delete             | Immediate               | true                       | 8d      |
| **azurefile-csi**         | `file.csi.azure.com` | Delete             | Immediate               | true                       | 8d      |
| **azurefile-csi-premium** | `file.csi.azure.com` | Delete             | Immediate               | true                       | 8d      |
| **azurefile-premium**     | `file.csi.azure.com` | Delete             | Immediate               | true                       | 8d      |
| **default (default)**     | `disk.csi.azure.com` | Delete             | WaitForFirstConsumer    | true                       | 8d      |
| **managed**               | `disk.csi.azure.com` | Delete             | WaitForFirstConsumer    | true                       | 8d      |
| **managed-csi**           | `disk.csi.azure.com` | Delete             | WaitForFirstConsumer    | true                       | 8d      |
| **managed-csi-premium**   | `disk.csi.azure.com` | Delete             | WaitForFirstConsumer    | true                       | 8d      |
| **managed-premium**       | `disk.csi.azure.com` | Delete             | WaitForFirstConsumer    | true                       | 8d      |

## The accessModes field in a PersistentVolumeClaim (PVC) tells Kubernetes how your pod(s) are allowed to read/write the attached volume.

| Access Mode                    | Abbreviation | Description                                                                                                          | Typical Backing Storage                                  |
| ------------------------------ | ------------ | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------|
| **ReadWriteOnce**              | `RWO`        | The volume can be mounted as **read-write by only one node at a time**. Multiple pods on the same node can share it. | Azure Disk, EBS, GCE Persistent Disk                     |
| **ReadOnlyMany**               | `ROX`        | The volume can be mounted **read-only by many nodes** simultaneously.                                                | NFS, Azure File (with read-only mount)                   |
| **ReadWriteMany**              | `RWX`        | The volume can be mounted **read-write by many nodes** at the same time.                                             | Azure File, NFS, CephFS Azure Blob (via Blob CSI driver) |
| **ReadWriteOncePod** *(newer)* | `RWOP`       | The volume can be mounted as read-write by **exactly one pod**, even if multiple pods share the same node.           | CSI volumes (Azure Disk supports this)                   |

But most Azure storage drivers support only one:

* Azure Disk → RWO
* Azure File → RWX, ROX, or RWO


## Disk Based Storage.

### What is disk basead Storage
Disk-based storage (also called block storage) means your data is stored on a virtual hard drive (disk) that behaves just like a physical SSD or HDD attached to a computer.

### Why disk basead Storage is required
✅ Single-writer consistency

* Databases like MongoDB, MySQL, PostgreSQL, Redis, etc., rely on ACID guarantees — meaning transactions must be atomic and consistent.
If multiple nodes tried writing to the same file system, it could cause:
* File corruption,
* Inconsistent state,
* Split-brain issues in clustered DBs.
* Since Azure Disk supports ReadWriteOnce, only one pod on one node can write — this ensures:

💾 One writer → One truth → No corruption.

✅ High Performance for Transactional Writes 
* Azure Disks (Premium SSD / Ultra Disk) are optimized for random I/O — ideal for databases that read/write small chunks. 
* File and Object storage, on the other hand, are optimized for streaming or shared access, not for fast random reads/writes.

### Who will use the disk based storage
💾 Applications Best Suited for Disk-Based Storage

* Disk-based (block) storage is ideal for applications that require fast, consistent, and exclusive access to persistent data.
* These workloads typically cannot tolerate data corruption, need guaranteed IOPS, and expect the storage to behave like a real SSD.
* Databases like MongoDB, MySQL, PostgreSQL, Redis, etc.,

### Where are Data Disk Created 
* Disks are Azure resources of type Microsoft.Compute/disks.
* They are stored in the node resource group (Node RG) and attached to VMSS instances (AKS worker nodes).
* When a pod runs:
* The disk is attached to the node VM.
* When the pod moves to another Node, the disk detaches from current node  and reattaches automatically to another node.

### ⚙️ How Azure Disk Storage Works with AKS
1. **Pod requests PVC**  
   → AKS uses the **Azure Disk CSI driver**.  
2. **Azure Disk created**  
   The disk is provisioned inside your **node resource group** in Azure.  
3. **Disk attached**  
   The disk is attached to the **node hosting the pod**.  
4. **Kubelet mounts the disk**  
   Kubelet on that node mounts the disk as a **filesystem** inside the pod’s container path.  
5. **Pod writes to the mounted path**  
   The pod writes to this mount — it’s just like writing to a **local SSD**.  
#### 🔄 If the pod moves to another node:
6. **Disk detaches**  
   The disk **detaches** from the old node automatically.  
7. **Disk reattaches**  
   The same disk **reattaches** to the new node where the pod is rescheduled.  
8. **Data persists**  
   Your data **remains intact** across pod restarts and rescheduling — ensuring persistent, reliable storage.  

---

✅ **Result:**  
Durable, node-attached block storage with **automatic reattachment and data persistence** — perfect for **stateful workloads like databases**.

#### StatefulSet with Volume Clame Template
```yaml
volumeClaimTemplates:
- metadata:
    name: mongodb-data
  spec:
    accessModes: ["ReadWriteOnce"]
    storageClassName: managed-csi
    resources:
      requests:
        storage: 20Gi
```

#### Data Flow:- Mongodb
```bash
   ┌──────────────────────┐
   │  MongoDB Primary     │
   │  (Pod-0, Node-1)     │
   │  PVC → pv-disk-0     │
   └────────┬─────────────┘
            │ Replication (oplog)
   ┌────────┴─────────────┐
   │ MongoDB Secondary-1  │
   │ (Pod-1, Node-2)      │
   │ PVC → pv-disk-1      │
   └────────┬─────────────┘
            │ Replication
   ┌────────┴─────────────┐
   │ MongoDB Secondary-2  │
   │ (Pod-2, Node-3)      │
   │ PVC → pv-disk-2      │
   └──────────────────────┘
```



### 📦 Access Modes for Azure Blob CSI Driver

| **Mount Type**                 | **CSI Driver**          | **Supported Access Modes**                     | **Explanation** |
|--------------------------------|--------------------------|------------------------------------------------|-----------------|
| **BlobFuse2 (default)**        | `blob.csi.azure.com`     | ✅ `ReadWriteMany (RWX)`  <br> ✅ `ReadOnlyMany (ROX)` | BlobFuse2 mounts Azure Blob containers as a **network file system**.<br>Multiple pods across nodes can access it simultaneously — either **read-write** or **read-only**. |
| **NFS 3.0 (Azure Blob NFS)**  | `blob.csi.azure.com`     | ✅ `ReadWriteMany (RWX)`  <br> ✅ `ReadOnlyMany (ROX)` | When your storage account has **NFS 3.0 enabled**, it behaves like an NFS share — supporting both **read-write** and **read-only** multi-node access. |
| **HTTPS (SDK or REST API)**   | *(No CSI mount)*         | 🚫 *Not applicable*                            | Direct API access (via HTTPS/SDK) bypasses CSI and operates at the **object level**, so Kubernetes volume access modes don’t apply. |
