# Azure RBAC

## Command to List All Role Definitions
```
az role definition list -o table
```

## Count total available roles 
```
az role definition list --query "length(@)"
```

## Get roles related to Storage account 
### First list a sample permission to understand the structure of role json to create below query 
```
az role definition list --name  "Storage Table Data Contributor"
```

```
az role definition list --query "[?roleName && (contains(to_string(roleName),'Storage'))].{RoleName:roleName,Type:type,RoleType:roleType}" -o table

az role definition list --query "[?roleName && (contains(to_string(roleName),'Storage')) ].{RoleName:roleName,Type:type,RoleType:roleType, PLength: length(permissions)}" -o table

az role definition list --query "[?roleName && (contains(to_string(roleName),'Storage')) ].{RoleName:roleName,Type:type,RoleType:roleType, DataActionLength: length(permissions[].dataActions[])}" -o table

az role definition list --query "[?roleName && (contains(to_string(roleName),'Storage')) ].{RoleName:roleName,Type:type,RoleType:roleType, DataActionLength: length(permissions[].dataActions[]), ActionLength: length(permissions[].actions[])}" -o table

```
.{Name:Name, RoleName:RoleName, Description:Description, RoleType:RoleType}

## Command to List Actions for a Role

```
az role definition list --name "<RoleName>" --query "[].permissions[].actions[]" -o table
```

