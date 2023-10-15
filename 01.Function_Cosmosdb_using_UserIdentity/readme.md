<h1> Lab:- Connect Azure function with Azure CosmosDB using User Identity </h1>

Date written -  <em> 02-Jan-2023 </em>

Last Updated - <em> 02-Jan-2023 </em>


<h2>Step: - 01 -  Install Azure CLI</h2>

<a href="https://learn.microsoft.com/en-in/cli/azure/install-azure-cli#install" >Install Azure CLI</a>


<h2>Step: - 02 -  Login to Azure via terminal </h2>

COMMAND:- `az login`

<h2> Step: - 03 -  Validate Subscription </h2>

COMMAND:- `az account show`

Output:- 

```
{
  "environmentName": "AzureCloud",
  "homeTenantId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "isDefault": true,
  "managedByTenants": [],
  "name": "Visual Studio Professional Subscription",
  "state": "Disabled",
  "tenantId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "user": {
    "name": "Alok_Adhao@xxx.com",
    "type": "user"
  }
}
```



