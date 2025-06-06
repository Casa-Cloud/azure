# Imagin Cloud with TLS

## Your Setup Architecture (Final)

```
+------------------------+
|   Browser (HTTP/HTTPS)  |
+-----------+------------+
            |
            v
+------------------------+
|  Azure Load Balancer   |
|    (Public IP)         |
+-----------+------------+
            |
            v
+----------------------------+
|  NGINX Ingress Controller  |
|         (Port 443)         |
+-----------+----------------+
            |
            v
+--------------------------------------------+
|  Ingress Rule (imagincloud-ingress)         |
+-----------+--------------------------------+
            |
            v
+------------------------+
| Kubernetes Service     |
+-----------+------------+
            |
            v
+------------------------+
| Node.js Application Pod |
+------------------------+

```

## Where TLS Breaks in Our Current Architecture
* Right now, TLS (HTTPS) is terminated at NGINX Ingress Controller.
* After that, traffic between:
* Ingress ➔ Service ➔ Pod is in plain HTTP (unencrypted) inside the Kubernetes cluster.
![](../../images/2025-04-27-18-39-04.png)

✅ But in highly secure environments (banks, healthcare),
they want TLS everywhere, even inside Kubernetes.

👉 That's called mTLS (Mutual TLS inside the cluster).


## 📋 Step 1A: Install (if not already) the NGINX Ingress Controller
```
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/cloud/deploy.yaml
```

## 📋 Step 1B: Check Service created
```
kubectl get svc -n ingress-nginx

NAME                                 TYPE           CLUSTER-IP     EXTERNAL-IP      PORT(S)                      AGE
ingress-nginx-controller             LoadBalancer   10.0.115.145   132.196.182.201   80:32400/TCP,443:30343/TCP   2m19s
ingress-nginx-controller-admission   ClusterIP      10.0.222.143   <none>           443/TCP                      2m18s
```

## 📋 Step 2A: Install cert-manager on AKS

Install cert-manager (latest stable version)
```
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.14.2/cert-manager.yaml
```

## 📋 Step 2B: After Running, Check cert-manager Pods
```
kubectl get pods --namespace cert-manager

Output:-
kubectl get pods --namespace cert-manager
NAME                                       READY   STATUS    RESTARTS   AGE
cert-manager-748d86b5f7-2gzq7              1/1     Running   0          75s
cert-manager-cainjector-758769998d-6kr7t   1/1     Running   0          76s
cert-manager-webhook-78659f8-ds5ls         1/1     Running   0          74s
```

## 📋 Step 3A: Create ClusterIssuers - mazacloud (for Let's Encrypt)

05.clusterissuer-imagincloud.yaml
```
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-imagincloud
spec:
  acme:
    email: alokadhao@outlook.com
    server: https://acme-v02.api.letsencrypt.org/directory
    privateKeySecretRef:
      name: letsencrypt-imagincloud
    solvers:
    - http01:
        ingress:
          class: nginx
```

## 🚀 Step 3B: Apply Both ClusterIssuers
```
kubectl apply -f 05.clusterissuer-imagincloud.yaml

Output:-
clusterissuer.cert-manager.io/letsencrypt-imagincloud created
```

## 🔥 Step 3C: Verify ClusterIssuers

```
kubectl get clusterissuers

Output:-
kubectl get clusterissuers
NAME                      READY   AGE
letsencrypt-imagincloud   True    41s
```

## Step 4A: Updated Ingress YAML: imagincloud-ingress.yaml
09-imagincloud-with-tls-ingress_redirect.yaml

```
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: imagincloud-ingress
  annotations:
    kubernetes.io/ingress.class: "nginx"
    cert-manager.io/cluster-issuer: "letsencrypt-imagincloud"
    nginx.ingress.kubernetes.io/ssl-redirect: "true" ## Added this line
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - imagincloud.com
    - dev.imagincloud.com
    - sit.imagincloud.com
    - uat.imagincloud.com
    secretName: imagincloud-tls
  rules:
  - host: imagincloud.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: nodejstemplate
            port:
              number: 80
  - host: dev.imagincloud.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: nodejstemplate
            port:
              number: 80
  - host: sit.imagincloud.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: nodejstemplate
            port:
              number: 80
  - host: uat.imagincloud.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: nodejstemplate
            port:
              number: 80
```



## Step 4B: Updated Ingress YAML: 09-imagincloud-with-tls-ingress_redirect.yaml

```
kubectl apply -f 09-imagincloud-with-tls-ingress_redirect.yaml

Output:- 
ingress.networking.k8s.io/imagincloud-ingress configured
```

## Step 4C:- Check Ingress Crated
```
kubectl get ingress
NAME                        CLASS    HOSTS                                                                 ADDRESS   PORTS     AGE
cm-acme-http-solver-228hl   <none>   uat.imagincloud.com                                                             80        14s
cm-acme-http-solver-bbrmj   <none>   sit.imagincloud.com                                                             80        14s
cm-acme-http-solver-bf87s   <none>   dev.imagincloud.com                                                             80        14s
cm-acme-http-solver-q7z6b   <none>   imagincloud.com                                                                 80        14s
imagincloud-ingress         nginx    imagincloud.com,dev.imagincloud.com,sit.imagincloud.com + 1 more...             80, 443   16s
```

## Step 4D:- Check certificate Created
```
kubectl get certificates
NAME              READY   SECRET            AGE
imagincloud-tls   True    imagincloud-tls   74s
```
## Step 4E:- Check Secret Created
```
get secrets
NAME                                   TYPE                 DATA   AGE
imagincloud-tls                        kubernetes.io/tls    2      82s
```

## 📋Step 5: Final Things You Can Test Now

![](../../images/2025-04-27-17-04-08.png)

![](../../images/2025-04-27-17-04-46.png)

![](../../images/2025-04-27-17-05-27.png)

![](../../images/2025-04-27-17-06-01.png)