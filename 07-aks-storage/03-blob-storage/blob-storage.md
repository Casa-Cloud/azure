# Blob Storage


| **Parameter**   | **Description**                                                                                                                                                                                                                                                                                                                                           |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `protocol`      | Determines how the blob storage is exposed to the pod (i.e., which mount method). Two main supported values: <br>• `fuse2` (i.e., BlobFuse2) — bridging blob-storage via FUSE/HTTPS. ([Microsoft Learn][1]) <br>• `nfs` — Use NFS v3 protocol (requires Premium Block Blob account + NFS enabled) for more “file-share” behaviour. ([Microsoft Learn][1]) |
| `skuName`       | Which storage tier/SKU for the blob storage container (e.g., `Standard_LRS`, `Premium_LRS`, `Premium_ZRS`) — affects performance, cost, redundancy. ([Microsoft Learn][2])                                                                                                                                                                                |
| `containerName` | The name of the container (in the Storage Account) that will be created/mounted. If omitted, the driver may auto-generate one per PVC. ([Microsoft Learn][1])                                                                                                                                                                                             |
| `tags`          | Optional: you may add tags (key/value) to the underlying storage via parameters. ([Microsoft Learn][1])                                                                                                                                                                                                                                                   |
| `isHnsEnabled`  | (For ADLS Gen2 accounts) If the storage account’s Hierarchical Namespace (HNS) is enabled, this parameter lets you treat blob storage as a “file-system” with directories etc. ([Microsoft Learn][1])                                                                                                                                                     |
| `mountOptions`  | Custom mount flags passed to BlobFuse2 or NFS mount command (cache settings, allow_other, etc.). ([Microsoft Learn][1])                                                                                                                                                                                                                                   |

[1]: https://learn.microsoft.com/en-us/azure/aks/azure-csi-blob-storage-provision?utm_source=chatgpt.com "Create a persistent volume with Azure Blob storage in Azure ..."
[2]: https://learn.microsoft.com/en-us/azure/aks/azure-blob-csi?utm_source=chatgpt.com "Use Azure Blob storage Container Storage Interface (CSI) driver"


## ✅ Summary of Protocols

BlobFuse2 (protocol: fuse2 or equivalent): Access via FUSE/HTTPS. Good for general access, across regions, simple setup.

NFS (protocol: nfs): Access via NFS v3, more “file share” semantics (POSIXish). Requires Premium Block Blob account + NFS enabled.

(Under the hood) both end up mapping to containers in Azure Blob Storage but exposed differently to the pod.

