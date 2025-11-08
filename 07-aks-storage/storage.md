## The accessModes field in a PersistentVolumeClaim (PVC) tells Kubernetes how your pod(s) are allowed to read/write the attached volume.

| Access Mode                    | Abbreviation | Description                                                                                                          | Typical Backing Storage                |
| ------------------------------ | ------------ | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| **ReadWriteOnce**              | `RWO`        | The volume can be mounted as **read-write by only one node at a time**. Multiple pods on the same node can share it. | Azure Disk, EBS, GCE Persistent Disk   |
| **ReadOnlyMany**               | `ROX`        | The volume can be mounted **read-only by many nodes** simultaneously.                                                | NFS, Azure File (with read-only mount) |
| **ReadWriteMany**              | `RWX`        | The volume can be mounted **read-write by many nodes** at the same time.                                             | Azure File, NFS, CephFS                |
| **ReadWriteOncePod** *(newer)* | `RWOP`       | The volume can be mounted as read-write by **exactly one pod**, even if multiple pods share the same node.           | CSI volumes (Azure Disk supports this) |

But most Azure storage drivers support only one:

* Azure Disk → RWO
* Azure File → RWX, ROX, or RWO

