# Nginx Controller 

## RBAC needed 

```
# Update your role to "Admin" on the cluster
az role assignment create \
  --assignee <your-user-object-id> \
  --role "Azure Kubernetes Service Cluster Admin Role" \
  --scope $(az aks show --resource-group <your-resource-group> --name <your-cluster-name> --query id -o tsv)
```

## Step 1: Install (if not already) the NGINX Ingress Controller

```
 kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/cloud/deploy.yaml

namespace/ingress-nginx created
serviceaccount/ingress-nginx created
serviceaccount/ingress-nginx-admission created
role.rbac.authorization.k8s.io/ingress-nginx created
role.rbac.authorization.k8s.io/ingress-nginx-admission created
clusterrole.rbac.authorization.k8s.io/ingress-nginx created
clusterrole.rbac.authorization.k8s.io/ingress-nginx-admission created
rolebinding.rbac.authorization.k8s.io/ingress-nginx created
rolebinding.rbac.authorization.k8s.io/ingress-nginx-admission created
clusterrolebinding.rbac.authorization.k8s.io/ingress-nginx created
clusterrolebinding.rbac.authorization.k8s.io/ingress-nginx-admission created
configmap/ingress-nginx-controller created
service/ingress-nginx-controller created
service/ingress-nginx-controller-admission created
deployment.apps/ingress-nginx-controller created
job.batch/ingress-nginx-admission-create created
job.batch/ingress-nginx-admission-patch created
ingressclass.networking.k8s.io/nginx created
validatingwebhookconfiguration.admissionregistration.k8s.io/ingress-nginx-admission created
```

```
kubectl get svc -n ingress-nginx

NAME                                 TYPE           CLUSTER-IP     EXTERNAL-IP      PORT(S)                      AGE
ingress-nginx-controller             LoadBalancer   10.0.115.145   135.237.211.17   80:32400/TCP,443:30343/TCP   2m19s
ingress-nginx-controller-admission   ClusterIP      10.0.222.143   <none>           443/TCP                      2m18s
```

## 🛠 Step 2: Set DNS A Record
Go to your DNS provider (Azure DNS / GoDaddy / etc.)
Create an A record:
Name: @
Type: A
IP: The EXTERNAL-IP you got in Step 1
This will map mazacloud.com ➔ your AKS ingress controller.

## 🛠 Step 3: Create Ingress YAML
Now create an Ingress resource to map /nodejstemplate path.

Here’s your Ingress YAML (casacloud-ingress.yaml):

```
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: casacloud-ingress
  annotations:
    kubernetes.io/ingress.class: "nginx"
spec:
  rules:
  - host: casacloud.com
    http:
      paths:
      - path: /nodejstemplate
        pathType: Prefix
        backend:
          service:
            name: nodejstemplate
            port:
              number: 80
```

```
kubectl apply -f casacloud-ingress.yaml
```

## 🛠 Step 4: Verify
Check the Ingress resource:

```
kubectl get ingress
```

## 🛠 Step 5: Final Testing
Once DNS is ready (~2-5 minutes for propagation),

👉 Open your browser:
```
http://mazacloud.com/nodejstemplate
```
