# What is Tenant
- One instance of Azure AD associated with a single organization is named Tenant.

- Each AD tenant might have 1 to N Azure Subscriptions. Azure Subscription — is a group of cloud services that are billed together.

# What is Microsoft Entra ID (Azure Active Directory)
- Azure Active Directory or AD is a cloud-based identity and access management service — it takes care of authentication and authorization of human-beings and software-based identities.

- Azure AD has associated Identities — things that can be authenticated within the AD. 
- Identities might belong to Users (a human with an email address or phone number) or to Applications (a piece of software like my shiny website or database, which stores its data).

- Azure AD helps to answer two questions:

    1.  Can I trust the Identity? (authentication)
    2.  Is Identity allowed to read/update/delete a resource? (authorization)

- Any AD Identity might be single-tenant (has access to resources of a single organization) or multi-tenant (two or more organizations).

# Application registration
- Application registration is a process of adding a new non-human Identity to AD. It leads to the creation of two objects in an Azure AD tenant:
    - An application object / ApplicationID (or ClientID) 
    - A service principal object / ObjectID

## What is Application object
- An Azure AD Application is defined by its one and only application object. The object resides in the Azure AD tenant, where the application was registered, known as the application’s “home” tenant.

- To query entity details with az cli:
```
az ad app list --display-name <APP_NAME> 
```
## What is Service principal object / ObjectID
- To access resources that are secured by an Azure AD tenant (for example, components in an Azure Subscription), the entity must be represented by a security principal, which Azure names Service Principal. 
- The service principal defines the access policy and permissions for the user/application in a single Azure AD tenant.
- Service Principal inherits base properties of associated Application (for example, AppName and ApplicationId)
- The ObjectID is a unique value for an application object. As with users, groups, and other resources, the ObjectID helps to identify an application instance in Microsoft Entra ID.

# Application and service principal relationship
- The Application object serves as the template from which common and default properties are derived for use in creating corresponding Service Principal objects.
- Consider the application object as the global representation of your application for use across all tenants and the service principal as the local representation for use in a specific tenant.

# Tenant-service principal relationships
<a href="https://learn.microsoft.com/en-us/azure/active-directory/architecture/service-accounts-principal#tenant-service-principal-relationships">Tenant-service principal relationships</a> 

- A single-tenant application has one service principal in its home tenant. 
- A multi-tenant web application requires a service principal in each tenant. - A service principal is created when a user from that tenant consents to use of the application. 
- This consent creates a one-to-many relationship between the multi-tenant application and its associated service principals.

## Login to azure cli - user login

```
az login
```

# Create Application / Application Registration using Azure CLI
<a href="https://learn.microsoft.com/en-us/cli/azure/ad/app?view=azure-cli-latest#az-ad-app-create()">Application Registration</a> 


![](images/2023-10-15-19-28-15.png)

```
az ad app create --display-name app01

Output:
{
    ...
    "appId": "c0901eeb-bcee-4723-b37d-4c9cf6bf01cd",
    "appRoles": [],
    "applicationTemplateId": null,
    "certification": null,
    "createdDateTime": "2023-10-15T11:45:00.124314Z",
    "defaultRedirectUri": null,
    "deletedDateTime": null,
    "description": null,
    "disabledByMicrosoftStatus": null,
    "displayName": "app01",
    "groupMembershipClaims": null,
    "id": "75971a4a-0528-42d3-900f-e07d7a8092ef",
    "identifierUris": []
    ...
}
```
![](images/2023-10-15-19-47-19.png)

![](images/2023-10-15-19-49-06.png)

## List App created 
```
alokadhao@Aloks-MacBook-Pro azure % az ad app list -o table
DisplayName    Id                                    AppId                                 CreatedDateTime
-------------  ------------------------------------  ------------------------------------  --------------------
app01          75971a4a-0528-42d3-900f-e07d7a8092ef  c0901eeb-bcee-4723-b37d-4c9cf6bf01cd  2023-10-15T11:45:00Z
```
# Create Service Principal via azure-cli

## Create simple Service principal and attach it to the application.
```
az ad sp create --id 75971a4a-0528-42d3-900f-e07d7a8092ef

Output:- 
{
    "accountEnabled": true,
  "addIns": [],
  "alternativeNames": [],
  "appDescription": null,
  "appDisplayName": "app01",
  "appId": "c0901eeb-bcee-4723-b37d-4c9cf6bf01cd",
  "appOwnerOrganizationId": "25a40921-face-4b5f-b7bf-f5a70eec7478",
  "appRoleAssignmentRequired": false,
  "appRoles": [],
  "applicationTemplateId": null,
  "createdDateTime": null,
  "deletedDateTime": null,
  "description": null,
  "disabledByMicrosoftStatus": null,
  "displayName": "app01",
  "homepage": null,
  "id": "4c04d49e-6b52-4432-99fa-fe004918ae0c", // Object ID 
}
```
### Now you can see that in Managed Application in local directory 
![](images/2023-10-15-20-15-51.png)

On click of App01

![](images/2023-10-15-20-17-05.png)
```
Application ID id the APP ID which we created in last step 
c0901eeb-bcee-4723-b37d-4c9cf6bf01cd

Where the Object ID is the ID of the Serice Prinicipal
4c04d49e-6b52-4432-99fa-fe004918ae0c
```
 
 ## List credentials of Service Principal
 ```
 az ad sp credential list --id 4c04d49e-6b52-4432-99fa-fe004918ae0c

 Output
[]
 ```
 ## Reset and Create a password for Service Prinicpal 
 ```
 az ad sp credential reset --id 4c04d49e-6b52-4432-99fa-fe004918ae0c

 Output:-
The output includes credentials that you must protect. Be sure that you do not include these credentials in your code or check the credentials into your source control. For more information, see https://aka.ms/azadsp-cli
{
  "appId": "c0901eeb-bcee-4723-b37d-4c9cf6bf01cd",
  "password": "58w8Q~RRnlGhGc63lsoJozLnF6mKYxdh31z.hdcv",
  "tenant": "25a40921-face-4b5f-b7bf-f5a70eec7478"
}
 ```
 You can see we have given the ID (Object ID of the Service Prinicipal) and it output it return the App ID of the Applicaiton the SP is attached to.

### List Credentials of Service Principal again 
```
az ad sp credential list --id 4c04d49e-6b52-4432-99fa-fe004918ae0c 
[
  {
    "customKeyIdentifier": null,
    "displayName": null,
    "endDateTime": "2024-10-15T12:26:42Z",
    "hint": "58w",
    "keyId": "af25e2bc-ac1b-4318-886f-88d983b82b40",
    "secretText": null,
    "startDateTime": "2023-10-15T12:26:42Z"
  }
]
```

## At this point if we try to list the credentials of the APPLICATION it is empty
```
az ad app credential list --id c0901eeb-bcee-4723-b37d-4c9cf6bf01cd
[]
```
By this we can conclude that credentials of APPLICATION AND SP are different. 
IF we resent the credentials of the SP, it does not affect the APPLICATION credentials.

# Login using the Service Prinicipal 
```
az login --service-principal -u c0901eeb-bcee-4723-b37d-4c9cf6bf01cd -p 58w8Q~RRnlGhGc63lsoJozLnF6mKYxdh31z.hdcv --tenant 25a40921-face-4b5f-b7bf-f5a70eec7478

Output:- 
ERROR:- 
No subscriptions found for c0901eeb-bcee-4723-b37d-4c9cf6bf01cd.
```
This is because the SP is just created, it does not have any RBAC role yet assighed to it.

# Steps to assign an Azure role - RBAC
<a href="https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments-cli">Assign Azure roles using Azure CLI</a> 

## Prerequisites
-  To assign roles, you must have:

  - Microsoft.Authorization/roleAssignments/write permissions, such as 
  - User Access Administrator or Owner
  - Bash in Azure Cloud Shell or Azure CLI

## Step 1: Determine who needs access
- You can assign a role to a user, group, service principal, or managed identity. - To assign a role, you might need to specify the unique ID of the object. The ID has the format: 11111111-1111-1111-1111-111111111111. 

### Get the ID of the Service Principal 
```
az ad sp list --all --query "[].{displayName:displayName, id:id}" --display-name "App01" --output tsv

Output:- 
app01   4c04d49e-6b52-4432-99fa-fe004918ae0c // THis is the Object ID of SP
```
So, we have the ID now.. 

## Step 2: Select the appropriate role
 - Permissions are grouped together into roles. You can select from a list of several Azure <a href="https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles">built-in roles</a>  or you can use your own custom roles. 
 - It's a best practice to grant access with the least privilege that is needed, so avoid assigning a broader role.

- To list roles and get the unique role ID, you can use <a href="https://learn.microsoft.com/en-us/cli/azure/role/definition#az-role-definition-list">az role definition list</a> .


List all role definitions 
```
az role definition list --query "[].{name:name, roleType:roleType, roleName:roleName}" --output tsv | grep Contributor

Output:- 

312a565d-c81f-4fd8-895a-4e21e48d571c    BuiltInRole     API Management Service Contributor
ae349356-3a1b-4a5e-921d-050484c6347e    BuiltInRole     Application Insights Component Contributor
4f8fab4f-1852-4a58-a46a-8eaf358af14a    BuiltInRole     Avere Contributor
5e467623-bb1f-42f4-a55d-6e525e11384b    BuiltInRole     Backup Contributor
5e3c6656-6cfa-4708-81fe-0de47ac73342    BuiltInRole     BizTalk Contributor
426e0c7f-0c7e-4658-b36f-ff54d6c29b45    BuiltInRole     CDN Endpoint Contributor
ec156ff8-a8d1-4d15-830c-5b80698ca432    BuiltInRole     CDN Profile Contributor
b34d265f-36f7-4a0d-a4d4-e158ca92e90f    BuiltInRole     Classic Network Contributor
86e8f5dc-a6e9-4c67-9d15-de283e8eac25    BuiltInRole     Classic Storage Account Contributor
9106cda0-8a86-4e81-b686-29a22c54effe    BuiltInRole     ClearDB MySQL DB Contributor
d73bb868-a0df-4d4d-bd69-98a00b01fccb    BuiltInRole     Classic Virtual Machine Contributor
25fbc0a9-bd7c-42a3-aa1a-3b75d497ee68    BuiltInRole     Cognitive Services Contributor
b24988ac-6180-42a0-ab88-20f7382dd24c    BuiltInRole     Contributor
434105ed-43f6-45c7-a02f-909b2ba83430    BuiltInRole     Cost Management Contributor
.
.
.
```

### List details of a perticular role 
Here's how to list the details of a particular role.


```
az role definition list --name "Contributor"

Output:- 

[
  {
    "assignableScopes": [
      "/"
    ],
    "description": "Grants full access to manage all resources, but does not allow you to assign roles in Azure RBAC, manage assignments in Azure Blueprints, or share image galleries.",
    "id": "/subscriptions/25398b88-a2d8-43ea-b766-57ea941d2327/providers/Microsoft.Authorization/roleDefinitions/b24988ac-6180-42a0-ab88-20f7382dd24c",
    "name": "b24988ac-6180-42a0-ab88-20f7382dd24c",
    "permissions": [
      {
        "actions": [
          "*"
        ],
        "dataActions": [],
        "notActions": [
          "Microsoft.Authorization/*/Delete",
          "Microsoft.Authorization/*/Write",
          "Microsoft.Authorization/elevateAccess/Action",
          "Microsoft.Blueprint/blueprintAssignments/write",
          "Microsoft.Blueprint/blueprintAssignments/delete",
          "Microsoft.Compute/galleries/share/action",
          "Microsoft.Purview/consents/write",
          "Microsoft.Purview/consents/delete"
        ],
        "notDataActions": []
      }
    ],
    "roleName": "Contributor",
    "roleType": "BuiltInRole",
    "type": "Microsoft.Authorization/roleDefinitions"
  }
]
```

## Step 3: Identify the needed scope
Azure provides four levels of scope: resource, resource group, subscription, and management group. It's a best practice to grant access with the least privilege that is needed, so avoid assigning a role at a broader scope. For more information about scope, see <a href="https://learn.microsoft.com/en-us/azure/role-based-access-control/scope-overview">Understand scope</a> .

### Resource group scope 
```
az group list --query "[].{name:name}" --output tsv
```

### Subscription scope

```
az account list --query "[].{name:name, id:id}" --output tsv

Output:-
Free Trial      25398b88-a2d8-43ea-b766-57ea941d2327
```

### Management group scope

```
az account management-group list --query "[].{name:name, id:id}" --output tsv
```

## Step 4: Assign role
To assign a role, use the <a href="https://learn.microsoft.com/en-us/cli/azure/role/assignment#az-role-assignment-create">az role assignment create</a> command. Depending on the scope, the command typically has one of the following formats.

```
az role assignment create --assignee "4c04d49e-6b52-4432-99fa-fe004918ae0c" \
--role "Contributor" \
--subscription "25398b88-a2d8-43ea-b766-57ea941d2327"

Output:- 

--scope argument will become required for creating a role assignment in the breaking change release of the fall of 2023. Please explicitly specify --scope.
{
  "condition": null,
  "conditionVersion": null,
  "createdBy": null,
  "createdOn": "2023-10-15T14:45:53.852228+00:00",
  "delegatedManagedIdentityResourceId": null,
  "description": null,
  "id": "/subscriptions/25398b88-a2d8-43ea-b766-57ea941d2327/providers/Microsoft.Authorization/roleAssignments/680f6524-b331-4d6e-9380-ba330cd27e0c",
  "name": "680f6524-b331-4d6e-9380-ba330cd27e0c",
  "principalId": "4c04d49e-6b52-4432-99fa-fe004918ae0c",
  "principalType": "ServicePrincipal",
  "roleDefinitionId": "/subscriptions/25398b88-a2d8-43ea-b766-57ea941d2327/providers/Microsoft.Authorization/roleDefinitions/b24988ac-6180-42a0-ab88-20f7382dd24c",
  "scope": "/subscriptions/25398b88-a2d8-43ea-b766-57ea941d2327",
  "type": "Microsoft.Authorization/roleAssignments",
  "updatedBy": "a3535f96-da6b-4ba0-b514-5a235d1d1583",
  "updatedOn": "2023-10-15T14:45:54.333234+00:00"
}
```

# Lets again try to Login using the Service principal after RBAC permission as contributor

## #Login using the Service Prinicipal 
```
az login --service-principal -u c0901eeb-bcee-4723-b37d-4c9cf6bf01cd -p 58w8Q~RRnlGhGc63lsoJozLnF6mKYxdh31z.hdcv --tenant 25a40921-face-4b5f-b7bf-f5a70eec7478

Output:- 

[
  {
    "cloudName": "AzureCloud",
    "homeTenantId": "25a40921-face-4b5f-b7bf-f5a70eec7478",
    "id": "25398b88-a2d8-43ea-b766-57ea941d2327",
    "isDefault": true,
    "managedByTenants": [],
    "name": "Free Trial",
    "state": "Enabled",
    "tenantId": "25a40921-face-4b5f-b7bf-f5a70eec7478",
    "user": {
      "name": "c0901eeb-bcee-4723-b37d-4c9cf6bf01cd",
      "type": "servicePrincipal"
    }
  }
]
```


# Create Service principal and add rbac iam role - contributor subscription level.

## All the steps that we did above to which are listed below is done by one command

1. Create Application Registration
2. Add Service Principal to Applicaiton 
3. Reset and Create a password for Service Prinicpal 
4. Steps to assign an Azure role - RBAC to Service Prinicpal 

```
az ad sp create-for-rbac --role="Contributor" --scopes="/subscriptions/25398b88-a2d8-43ea-b766-57ea941d2327" --name=app003

Output:- 

Found an existing application instance: (id) 19bcfd14-f6d2-426e-a8aa-adbde4b51279. We will patch it.
Creating 'Contributor' role assignment under scope '/subscriptions/25398b88-a2d8-43ea-b766-57ea941d2327'
The output includes credentials that you must protect. Be sure that you do not include these credentials in your code or check the credentials into your source control. For more information, see https://aka.ms/azadsp-cli
{
  "appId": "5994d67f-6368-42d4-ac56-939d26f21f29",
  "displayName": "app003",
  "password": "P5v8Q~B7VIV5AaSf96KnuoLZYJM.2OqWxbSIrcJB",
  "tenant": "25a40921-face-4b5f-b7bf-f5a70eec7478"
}
```

## we can login with this service Principal 

```
az login --service-principal -u 5994d67f-6368-42d4-ac56-939d26f21f29 -p P5v8Q~B7VIV5AaSf96KnuoLZYJM.2OqWxbSIrcJB --tenant 25a40921-face-4b5f-b7bf-f5a70eec7478

Output:- 

[
  {
    "cloudName": "AzureCloud",
    "homeTenantId": "25a40921-face-4b5f-b7bf-f5a70eec7478",
    "id": "25398b88-a2d8-43ea-b766-57ea941d2327",
    "isDefault": true,
    "managedByTenants": [],
    "name": "Free Trial",
    "state": "Enabled",
    "tenantId": "25a40921-face-4b5f-b7bf-f5a70eec7478",
    "user": {
      "name": "5994d67f-6368-42d4-ac56-939d26f21f29",
      "type": "servicePrincipal"
    }
  }
]
```

Now lets track back what it did in one command.. 

### All Applications Created
![](images/2023-10-15-23-13-01.png)
### Application Registered
![](images/2023-10-15-23-10-33.png)

### Servie Principal Created 
![](images/2023-10-15-23-11-56.png)


### Secret Created as well
![](images/2023-10-15-23-14-17.png)

# Differernce between the 2 approaches .. 

1. In long approach we have reset the credentials of the Service Principal 
2. in Single command approach we see that the secret is added to the application 
and not to the service principal

### Validate if secret is present for APP 
```
az ad app credential list --id  5994d67f-6368-42d4-ac56-939d26f21f29
[
  {
    "customKeyIdentifier": null,
    "displayName": "rbac",
    "endDateTime": "2024-10-15T14:58:16Z",
    "hint": "P5v",
    "keyId": "68f2798f-06e6-4415-a56b-0b83b92c55f5",
    "secretText": null,
    "startDateTime": "2023-10-15T14:58:16Z"
  }
]
```

Present for Applicaiton.

### Validate if credentials are present for the Service Principal
 ```
 az ad sp credential list --id 70cf0be9-954f-4512-ae80-cdb238042157

 Output
[]
 ```
# This Proves two things - Lession Learned
1. Login by Application is possible when SP do not have credentials set
2. Login by SP is possible when credentials for Application is not set.
3. Difference between our two approaches - az ad sp create-for-rbac sets the credentials for Application and not for the SP attached to the Application
4. Point is during login we never give the SP Object ID we always gives the Applicaiton ID in both the cases
EG:- In case 1 (Long Method) (which works)
```
az login --service-principal -u c0901eeb-bcee-4723-b37d-4c9cf6bf01cd -p 58w8Q~RRnlGhGc63lsoJozLnF6mKYxdh31z.hdcv --tenant 25a40921-face-4b5f-b7bf-f5a70eec7478
```
## If instead of Application ID If I give the object ID of service PRincipal then 
```
az login --service-principal -u 4c04d49e-6b52-4432-99fa-fe004918ae0c -p 58w8Q~RRnlGhGc63lsoJozLnF6mKYxdh31z.hdcv --tenant 25a40921-face-4b5f-b7bf-f5a70eec7478

Output:-
ERROR
AADSTS700016: Application with identifier '4c04d49e-6b52-4432-99fa-fe004918ae0c' was not found in the directory 'Default Directory'. This can happen if the application has not been installed by the administrator of the tenant or consented to by any user in the tenant. You may have sent your authentication request to the wrong tenant.
Trace ID: 661ec8c3-59c3-41bf-922c-d7ec529d7c00
Correlation ID: 9343fdb4-195c-40a4-b4d6-acddabb45209
Timestamp: 2023-10-15 15:34:27Z
```

5. Though we call in az login --service-principal, -u SHOULD be APPLICATION ID/ Client ID. BUT the SECRET/ PASSWORD can be of APPLICATION OR SERVICE PRINCIPAL it works.

