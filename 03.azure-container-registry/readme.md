# Azure Container Registry

# First we need to create a resource group
```
az group create -l eastus -n casacloud_rg1
```

## Create ACR 

### Schema
```
az acr create \
--resource-group <ResourceGroupName> \
--name <RegistryName> \
--sku <SKU> \
--location <Location>
```

```
az acr create \
--resource-group casacloud_rg1 \
 --name casaacr01 \
 --sku Standard \
 --location eastus
```

## ACR RBAC roles / permissions 

| **Role Name**        | **Can Login** | **Can Push Images** | **Can Pull Images** |
|----------------------|---------------|----------------------|----------------------|
| `AcrPull`            | ✅            | ❌                   | ✅                   |
| `AcrPush`            | ✅            | ✅                   | ✅                   |
| `AcrDelete`          | ✅            | ❌                   | ❌                   |
| `Owner/Contributor`  | ✅            | ✅                   | ✅                   |

## Tipical Usecase

| **Use Case**                        | **Recommended Role** |
|-------------------------------------|------------------------|
| CI/CD pipeline (push + pull)        | `AcrPush`              |
| Runtime service (pull only)         | `AcrPull`              |
| Admin managing the registry         | `Contributor`          |


## login to ACR 

```
az acr login --name casaacr01
Login Succeeded
```

## Get ACR server URL

```
az acr show --name casaacr01 --query loginServer --output tsv

Output:- 
Result
--------------------
casaacr01.azurecr.io
```

Now, as we already have our Nodejs MS Image

```
docker image ls 
REPOSITORY                 TAG       IMAGE ID       CREATED      SIZE
casacloud/nodejstemplate   v1.0.0    071c78f94cdb   2 days ago   1.7GB
```

## Tag it to push to ACR

```
docker tag casacloud/nodejstemplate:v1.0.0 casaacr01.azurecr.io/nodejstemplate:v1.0.0
```

## Check the tag created
```
docker image ls
REPOSITORY                            TAG       IMAGE ID       CREATED      SIZE
casaacr01.azurecr.io/nodejstemplate   v1.0.0    071c78f94cdb   2 days ago   1.7GB
casacloud/nodejstemplate              v1.0.0    071c78f94cdb   2 days ago   1.7GB
```

## Push image to ACR 

```
docker push casaacr01.azurecr.io/nodejstemplate:v1.0.0
The push refers to repository [casaacr01.azurecr.io/nodejstemplate]
ca40eb2cc73f: Pushed 
b941ee2050ee: Pushed 
545aa82ec479: Pushed 
4378a6c11dea: Pushed 
bb93ae7f4157: Pushed 
2beda0b59754: Pushed 
393b8c4241d6: Pushed 
5b7e218105bf: Pushed 
38239d1c4e71: Pushed 
d8e77eeb24ad: Pushed 
741f818d784d: Pushed 
aa8c81564288: Pushed 
f5dd139e905c: Pushed 
1d9d474cce08: Pushed 
cef1896c5ff1: Pushed 
4d53f446d6aa: Pushed 
0bc2c36fb01d: Pushed 
ccb04af356d0: Pushed 
0f7716873fd1: Pushed 
4a1d4d1677e5: Pushed 
140d15be2fea: Pushed 
eaefe43eb0ea: Pushed 
v1.0.0: digest: sha256:071c78f94cdb1bc855d04026c961d3edb4777fa34b443243972da36539570cdd size: 856
```

## Check of Image is present in ACR 
```
az acr repository list --name casaacr01
[
  "nodejstemplate"
]
```

## Show the repository 
```
az acr repository show --name casaacr01 --repository nodejstemplate
{
  "changeableAttributes": {
    "deleteEnabled": true,
    "listEnabled": true,
    "readEnabled": true,
    "writeEnabled": true
  },
  "createdTime": "2025-04-09T14:59:48.7546763Z",
  "imageName": "nodejstemplate",
  "lastUpdateTime": "2025-04-09T14:59:50.3720327Z",
  "manifestCount": 3,
  "registry": "casaacr01.azurecr.io",
  "tagCount": 1
}
```

## Show all the tags for perticular repository
```
az acr repository show-tags \
--name casaacr01 \
--repository nodejstemplate

Output
[
  "v1.0.0"
]
```

## Create another image tag and push 
```
docker tag casacloud/nodejstemplate:v1.0.0 casaacr01.azurecr.io/nodejstemplate:v1.0.1
```

```
docker push casaacr01.azurecr.io/nodejstemplate:v1.0.1
```

## Delete a perticular image tag

```
az acr repository untag -n casaacr01 --image nodejstemplate:v1.0.1
```

## Verify tags 

```
az acr repository show-tags \                                     
--name casaacr01 \
--repository nodejstemplate
[
  "v1.0.0"
]
```

## Delete a repository from an Azure Container Registry.

```
az acr repository delete -n casaacr01 --repository nodejstemplate
Are you sure you want to delete the repository 'nodejstemplate' and all images under it? (y/n): y
{
  "manifestsDeleted": [
    "sha256:071c78f94cdb1bc855d04026c961d3edb4777fa34b443243972da36539570cdd",
    "sha256:27d41776655eb21790007b595783d792e973a2c19175ef355f20323b0de83ee2",
    "sha256:407ae02c46bb0a02556228e2b3f75037c8723380f49a3eef8424a4cd4a0cb8fd"
  ],
  "tagsDeleted": [
    "v1.0.0"
  ]
}
```

## Pricing SKU


https://azure.microsoft.com/en-us/pricing/details/container-registry/


| **Feature**                   | **Basic**        | **Standard**     | **Premium**       |
|------------------------------|------------------|------------------|-------------------|
| Webhooks                     | ✅                | ✅                | ✅                 |
| Geo-replication              | ❌                | ❌                | ✅                 |
| Private link support         | ❌                | ❌                | ✅                 |
| Content trust                | ❌                | ❌                | ✅                 |
| Customer-managed keys        | ❌                | ❌                | ✅                 |
| Throughput                   | Low               | Medium            | High              |
| Storage (included)           | 10 GB             | 100 GB            | 500 GB            |
| Max webhooks                 | 2                 | 10                | 100               |
| **Estimated Price (USD/month)** | ~$0.167/day (~$5) | ~$0.667/day (~$20) | ~$2.33/day (~$70) |

###  Which one you should consider 
| **SKU**       | **Description**                                                   | **Use Case**                          |
|---------------|-------------------------------------------------------------------|----------------------------------------|
| `Basic`       | Entry-level, cost-effective registry with limited throughput      | Dev/test, personal projects            |
| `Standard`    | Balanced performance and cost, suitable for most production use   | Production, moderate usage             |
| `Premium`     | High throughput, geo-replication, private link, content trust     | Enterprise, geo-distributed systems    |
