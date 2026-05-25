# AWS Deployment Workflow Guide
## React + Node.js with EKS, Jenkins, Docker, Prometheus & Grafana

> **Purpose**: Step-by-step workflow for AI agents to deploy a production-ready application on AWS

---

## 📋 Prerequisites Checklist

Before starting, ensure you have:

- [ ] AWS Account with admin access
- [ ] AWS CLI installed and configured
- [ ] GitHub repository with React frontend and Node.js backend code
- [ ] Basic understanding of Docker, Kubernetes, and CI/CD concepts

### Required AWS Permissions
- EC2 full access
- VPC management
- IAM role creation
- ECR full access
- EKS cluster management

---

## 🎯 Project Variables

**Configure these values before starting:**

```bash
# AWS Configuration
AWS_REGION="ap-south-1"
AWS_ACCOUNT_ID="YOUR_AWS_ACCOUNT_ID"
VPC_NAME="production-vpc"
CLUSTER_NAME="production-cluster"

# ECR Repositories
ECR_FRONTEND_REPO="react-frontend"
ECR_BACKEND_REPO="node-backend"

# GitHub
GITHUB_REPO_URL="https://github.com/YOUR_USERNAME/YOUR_REPO.git"

# Project Paths
FRONTEND_PATH="./frontend"
BACKEND_PATH="./backend"
```

---

## 🚀 PHASE 1: AWS Infrastructure Setup

### Step 1.1: Create VPC and Networking

**Objective**: Set up isolated network environment

**Actions**:

1. **Create VPC**
```bash
VPC_ID=$(aws ec2 create-vpc \
  --cidr-block 10.0.0.0/16 \
  --tag-specifications "ResourceType=vpc,Tags=[{Key=Name,Value=$VPC_NAME}]" \
  --region $AWS_REGION \
  --query 'Vpc.VpcId' \
  --output text)

echo "VPC Created: $VPC_ID"
```

2. **Create Internet Gateway**
```bash
IGW_ID=$(aws ec2 create-internet-gateway \
  --tag-specifications "ResourceType=internet-gateway,Tags=[{Key=Name,Value=${VPC_NAME}-igw}]" \
  --region $AWS_REGION \
  --query 'InternetGateway.InternetGatewayId' \
  --output text)

aws ec2 attach-internet-gateway \
  --vpc-id $VPC_ID \
  --internet-gateway-id $IGW_ID \
  --region $AWS_REGION
```

3. **Create Public Subnets** (for Jenkins & Load Balancer)
```bash
PUBLIC_SUBNET_1=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.1.0/24 \
  --availability-zone ${AWS_REGION}a \
  --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=public-subnet-1}]" \
  --region $AWS_REGION \
  --query 'Subnet.SubnetId' \
  --output text)

PUBLIC_SUBNET_2=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.2.0/24 \
  --availability-zone ${AWS_REGION}b \
  --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=public-subnet-2}]" \
  --region $AWS_REGION \
  --query 'Subnet.SubnetId' \
  --output text)
```

4. **Create Private Subnets** (for EKS nodes)
```bash
PRIVATE_SUBNET_1=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.10.0/24 \
  --availability-zone ${AWS_REGION}a \
  --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=private-subnet-1}]" \
  --region $AWS_REGION \
  --query 'Subnet.SubnetId' \
  --output text)

PRIVATE_SUBNET_2=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.11.0/24 \
  --availability-zone ${AWS_REGION}b \
  --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=private-subnet-2}]" \
  --region $AWS_REGION \
  --query 'Subnet.SubnetId' \
  --output text)
```

5. **Create NAT Gateway** (for private subnet internet access)
```bash
# Allocate Elastic IP
EIP_ALLOC=$(aws ec2 allocate-address \
  --domain vpc \
  --region $AWS_REGION \
  --query 'AllocationId' \
  --output text)

# Create NAT Gateway in public subnet
NAT_GW=$(aws ec2 create-nat-gateway \
  --subnet-id $PUBLIC_SUBNET_1 \
  --allocation-id $EIP_ALLOC \
  --tag-specifications "ResourceType=natgateway,Tags=[{Key=Name,Value=${VPC_NAME}-nat}]" \
  --region $AWS_REGION \
  --query 'NatGateway.NatGatewayId' \
  --output text)

# Wait for NAT Gateway to be available
aws ec2 wait nat-gateway-available \
  --nat-gateway-ids $NAT_GW \
  --region $AWS_REGION
```

6. **Configure Route Tables**
```bash
# Public Route Table
PUBLIC_RT=$(aws ec2 create-route-table \
  --vpc-id $VPC_ID \
  --tag-specifications "ResourceType=route-table,Tags=[{Key=Name,Value=public-rt}]" \
  --region $AWS_REGION \
  --query 'RouteTable.RouteTableId' \
  --output text)

aws ec2 create-route \
  --route-table-id $PUBLIC_RT \
  --destination-cidr-block 0.0.0.0/0 \
  --gateway-id $IGW_ID \
  --region $AWS_REGION

# Associate public subnets
aws ec2 associate-route-table \
  --subnet-id $PUBLIC_SUBNET_1 \
  --route-table-id $PUBLIC_RT \
  --region $AWS_REGION

aws ec2 associate-route-table \
  --subnet-id $PUBLIC_SUBNET_2 \
  --route-table-id $PUBLIC_RT \
  --region $AWS_REGION

# Private Route Table
PRIVATE_RT=$(aws ec2 create-route-table \
  --vpc-id $VPC_ID \
  --tag-specifications "ResourceType=route-table,Tags=[{Key=Name,Value=private-rt}]" \
  --region $AWS_REGION \
  --query 'RouteTable.RouteTableId' \
  --output text)

aws ec2 create-route \
  --route-table-id $PRIVATE_RT \
  --destination-cidr-block 0.0.0.0/0 \
  --nat-gateway-id $NAT_GW \
  --region $AWS_REGION

# Associate private subnets
aws ec2 associate-route-table \
  --subnet-id $PRIVATE_SUBNET_1 \
  --route-table-id $PRIVATE_RT \
  --region $AWS_REGION

aws ec2 associate-route-table \
  --subnet-id $PRIVATE_SUBNET_2 \
  --route-table-id $PRIVATE_RT \
  --region $AWS_REGION
```

**✅ Validation**:
```bash
# Verify VPC components
aws ec2 describe-vpcs --vpc-ids $VPC_ID --region $AWS_REGION
aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" --region $AWS_REGION
aws ec2 describe-nat-gateways --filter "Name=vpc-id,Values=$VPC_ID" --region $AWS_REGION
```

**Expected Outcome**: VPC with 2 public subnets, 2 private subnets, IGW, and NAT Gateway

---

### Step 1.2: Create IAM Roles

**Objective**: Set up permissions for Jenkins and EKS

**Actions**:

1. **Create Jenkins EC2 Role**

Create trust policy file:
```bash
cat > jenkins-trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ec2.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF
```

Create role:
```bash
aws iam create-role \
  --role-name JenkinsEC2Role \
  --assume-role-policy-document file://jenkins-trust-policy.json \
  --region $AWS_REGION
```

Attach policies:
```bash
aws iam attach-role-policy \
  --role-name JenkinsEC2Role \
  --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryFullAccess

aws iam attach-role-policy \
  --role-name JenkinsEC2Role \
  --policy-arn arn:aws:iam::aws:policy/AmazonEKSClusterPolicy

aws iam attach-role-policy \
  --role-name JenkinsEC2Role \
  --policy-arn arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy

aws iam attach-role-policy \
  --role-name JenkinsEC2Role \
  --policy-arn arn:aws:iam::aws:policy/IAMReadOnlyAccess
```

Create instance profile:
```bash
aws iam create-instance-profile \
  --instance-profile-name JenkinsEC2InstanceProfile

aws iam add-role-to-instance-profile \
  --instance-profile-name JenkinsEC2InstanceProfile \
  --role-name JenkinsEC2Role
```

2. **Create EKS Cluster Role**

Create trust policy:
```bash
cat > eks-cluster-trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "eks.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF
```

Create role:
```bash
aws iam create-role \
  --role-name EKSClusterRole \
  --assume-role-policy-document file://eks-cluster-trust-policy.json

aws iam attach-role-policy \
  --role-name EKSClusterRole \
  --policy-arn arn:aws:iam::aws:policy/AmazonEKSClusterPolicy
```

3. **Create EKS Node Group Role**

Create trust policy:
```bash
cat > eks-node-trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ec2.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF
```

Create role:
```bash
aws iam create-role \
  --role-name EKSNodeGroupRole \
  --assume-role-policy-document file://eks-node-trust-policy.json

aws iam attach-role-policy \
  --role-name EKSNodeGroupRole \
  --policy-arn arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy

aws iam attach-role-policy \
  --role-name EKSNodeGroupRole \
  --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly

aws iam attach-role-policy \
  --role-name EKSNodeGroupRole \
  --policy-arn arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy
```

**✅ Validation**:
```bash
aws iam get-role --role-name JenkinsEC2Role
aws iam get-role --role-name EKSClusterRole
aws iam get-role --role-name EKSNodeGroupRole
```

**Expected Outcome**: Three IAM roles with appropriate policies attached

---

### Step 1.3: Create ECR Repositories

**Objective**: Create container registries for Docker images

**Actions**:

```bash
# Create frontend repository
aws ecr create-repository \
  --repository-name $ECR_FRONTEND_REPO \
  --region $AWS_REGION

# Create backend repository
aws ecr create-repository \
  --repository-name $ECR_BACKEND_REPO \
  --region $AWS_REGION

# Get repository URIs
FRONTEND_ECR_URI=$(aws ecr describe-repositories \
  --repository-names $ECR_FRONTEND_REPO \
  --region $AWS_REGION \
  --query 'repositories[0].repositoryUri' \
  --output text)

BACKEND_ECR_URI=$(aws ecr describe-repositories \
  --repository-names $ECR_BACKEND_REPO \
  --region $AWS_REGION \
  --query 'repositories[0].repositoryUri' \
  --output text)

echo "Frontend ECR: $FRONTEND_ECR_URI"
echo "Backend ECR: $BACKEND_ECR_URI"
```

**✅ Validation**:
```bash
aws ecr describe-repositories --region $AWS_REGION
```

**Expected Outcome**: Two ECR repositories created

---

## 🚀 PHASE 2: Jenkins Server Setup

### Step 2.1: Launch Jenkins EC2 Instance

**Objective**: Deploy Jenkins server in public subnet

**Actions**:

1. **Create Security Group**
```bash
JENKINS_SG=$(aws ec2 create-security-group \
  --group-name jenkins-sg \
  --description "Security group for Jenkins server" \
  --vpc-id $VPC_ID \
  --region $AWS_REGION \
  --query 'GroupId' \
  --output text)

# Allow SSH
aws ec2 authorize-security-group-ingress \
  --group-id $JENKINS_SG \
  --protocol tcp \
  --port 22 \
  --cidr 0.0.0.0/0 \
  --region $AWS_REGION

# Allow Jenkins web interface
aws ec2 authorize-security-group-ingress \
  --group-id $JENKINS_SG \
  --protocol tcp \
  --port 8080 \
  --cidr 0.0.0.0/0 \
  --region $AWS_REGION

# Allow HTTPS
aws ec2 authorize-security-group-ingress \
  --group-id $JENKINS_SG \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0 \
  --region $AWS_REGION
```

2. **Create User Data Script**
```bash
cat > jenkins-userdata.sh <<'EOF'
#!/bin/bash
set -e

# Update system
apt-get update -y
apt-get upgrade -y

# Install Docker
apt-get install -y docker.io
systemctl enable docker
systemctl start docker

# Add ubuntu user to docker group
usermod -aG docker ubuntu

# Install Java
apt-get install -y openjdk-17-jdk

# Install Jenkins
wget -q -O - https://pkg.jenkins.io/debian-stable/jenkins.io.key | apt-key add -
sh -c 'echo deb https://pkg.jenkins.io/debian-stable binary/ > /etc/apt/sources.list.d/jenkins.list'
apt-get update -y
apt-get install -y jenkins

# Add jenkins user to docker group
usermod -aG docker jenkins

# Start Jenkins
systemctl enable jenkins
systemctl start jenkins

# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl
mv kubectl /usr/local/bin/

# Install eksctl
curl --silent --location "https://github.com/weaveworks/eksctl/releases/latest/download/eksctl_Linux_amd64.tar.gz" | tar xz -C /tmp
mv /tmp/eksctl /usr/local/bin/

# Install AWS CLI
apt-get install -y awscli

# Install Helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Restart Docker to apply group changes
systemctl restart docker
systemctl restart jenkins

echo "Jenkins installation complete!"
EOF
```

3. **Launch EC2 Instance**
```bash
# Get latest Ubuntu 22.04 AMI
UBUNTU_AMI=$(aws ec2 describe-images \
  --owners 099720109477 \
  --filters "Name=name,Values=ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*" \
  --query 'Images | sort_by(@, &CreationDate) | [-1].ImageId' \
  --region $AWS_REGION \
  --output text)

# Launch instance
JENKINS_INSTANCE=$(aws ec2 run-instances \
  --image-id $UBUNTU_AMI \
  --instance-type t3.large \
  --key-name YOUR_KEY_PAIR_NAME \
  --subnet-id $PUBLIC_SUBNET_1 \
  --security-group-ids $JENKINS_SG \
  --iam-instance-profile Name=JenkinsEC2InstanceProfile \
  --user-data file://jenkins-userdata.sh \
  --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=jenkins-server}]" \
  --region $AWS_REGION \
  --query 'Instances[0].InstanceId' \
  --output text)

echo "Jenkins Instance ID: $JENKINS_INSTANCE"

# Wait for instance to be running
aws ec2 wait instance-running \
  --instance-ids $JENKINS_INSTANCE \
  --region $AWS_REGION

# Allocate and associate Elastic IP
JENKINS_EIP=$(aws ec2 allocate-address \
  --domain vpc \
  --region $AWS_REGION \
  --query 'AllocationId' \
  --output text)

aws ec2 associate-address \
  --instance-id $JENKINS_INSTANCE \
  --allocation-id $JENKINS_EIP \
  --region $AWS_REGION

# Get public IP
JENKINS_PUBLIC_IP=$(aws ec2 describe-addresses \
  --allocation-ids $JENKINS_EIP \
  --region $AWS_REGION \
  --query 'Addresses[0].PublicIp' \
  --output text)

echo "Jenkins Public IP: $JENKINS_PUBLIC_IP"
echo "Access Jenkins at: http://$JENKINS_PUBLIC_IP:8080"
```

**✅ Validation**:

Wait 5-10 minutes for installation to complete, then:

```bash
# SSH into instance
ssh -i YOUR_KEY_PAIR.pem ubuntu@$JENKINS_PUBLIC_IP

# Check services
sudo systemctl status jenkins
sudo systemctl status docker
kubectl version --client
eksctl version
```

Get initial admin password:
```bash
sudo cat /var/lib/jenkins/secrets/initialAdminPassword
```

**Expected Outcome**: Jenkins accessible at http://JENKINS_PUBLIC_IP:8080

---

### Step 2.2: Configure Jenkins

**Objective**: Set up Jenkins with required plugins

**Actions** (via Jenkins Web UI):

1. **Initial Setup**
   - Access http://JENKINS_PUBLIC_IP:8080
   - Enter initial admin password
   - Install suggested plugins
   - Create admin user

2. **Install Required Plugins**
   - Go to: Manage Jenkins → Manage Plugins → Available
   - Install:
     - Docker Pipeline
     - Kubernetes CLI
     - AWS Credentials
     - Git
     - Pipeline
   - Restart Jenkins

3. **Configure AWS Credentials**
   - Manage Jenkins → Manage Credentials → Global → Add Credentials
   - Kind: AWS Credentials
   - ID: `aws-credentials`
   - Note: Since we're using IAM role, credentials are auto-configured

**✅ Validation**: All plugins installed and Jenkins restarted successfully

---

## 🚀 PHASE 3: EKS Cluster Setup

### Step 3.1: Create EKS Cluster

**Objective**: Deploy Kubernetes cluster

**Actions**:

1. **Create cluster configuration file**
```bash
cat > eks-cluster-config.yaml <<EOF
apiVersion: eksctl.io/v1alpha5
kind: ClusterConfig

metadata:
  name: $CLUSTER_NAME
  region: $AWS_REGION

vpc:
  id: "$VPC_ID"
  subnets:
    private:
      ${AWS_REGION}a:
        id: "$PRIVATE_SUBNET_1"
      ${AWS_REGION}b:
        id: "$PRIVATE_SUBNET_2"
    public:
      ${AWS_REGION}a:
        id: "$PUBLIC_SUBNET_1"
      ${AWS_REGION}b:
        id: "$PUBLIC_SUBNET_2"

managedNodeGroups:
  - name: ng-1
    instanceType: t3.medium
    desiredCapacity: 2
    minSize: 2
    maxSize: 4
    privateNetworking: true
    subnets:
      - $PRIVATE_SUBNET_1
      - $PRIVATE_SUBNET_2
    iam:
      withAddonPolicies:
        imageBuilder: true
        autoScaler: true
        externalDNS: true
        certManager: true
        albIngress: true
        cloudWatch: true
        ebs: true
EOF
```

2. **Create cluster** (takes 15-20 minutes)
```bash
eksctl create cluster -f eks-cluster-config.yaml
```

3. **Configure kubectl**
```bash
aws eks update-kubeconfig \
  --region $AWS_REGION \
  --name $CLUSTER_NAME
```

**✅ Validation**:
```bash
kubectl get nodes
kubectl get namespaces
kubectl cluster-info
```

**Expected Outcome**: 2 worker nodes in Ready state

---

### Step 3.2: Configure Jenkins to Access EKS

**Objective**: Allow Jenkins to deploy to Kubernetes

**Actions** (SSH into Jenkins server):

```bash
# Configure kubeconfig for jenkins user
sudo su - jenkins
aws eks update-kubeconfig \
  --region $AWS_REGION \
  --name $CLUSTER_NAME

# Test access
kubectl get nodes

# Exit jenkins user
exit
```

**✅ Validation**:
```bash
sudo su - jenkins -c "kubectl get nodes"
```

**Expected Outcome**: Jenkins user can access EKS cluster

---

## 🚀 PHASE 4: Application Dockerization

### Step 4.1: Create Frontend Dockerfile

**Objective**: Containerize React application

**Actions**:

Create `frontend/Dockerfile`:
```dockerfile
# Multi-stage build for React
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage with nginx
FROM nginx:alpine

# Copy built assets
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration (if needed)
# COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

**Optional nginx configuration** (`frontend/nginx.conf`):
```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://backend-service:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**✅ Validation**:
```bash
cd frontend
docker build -t react-frontend-test .
docker run -d -p 3000:80 react-frontend-test
# Test: curl http://localhost:3000
docker stop $(docker ps -q --filter ancestor=react-frontend-test)
```

---

### Step 4.2: Create Backend Dockerfile

**Objective**: Containerize Node.js application

**Actions**:

Create `backend/Dockerfile`:
```dockerfile
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy application code
COPY . .

# Expose application port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "server.js"]
```

**Add health endpoint** to `backend/server.js`:
```javascript
// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});
```

**✅ Validation**:
```bash
cd backend
docker build -t node-backend-test .
docker run -d -p 5000:5000 node-backend-test
# Test: curl http://localhost:5000/health
docker stop $(docker ps -q --filter ancestor=node-backend-test)
```

---

### Step 4.3: Create .dockerignore Files

**Actions**:

Create `frontend/.dockerignore`:
```
node_modules
npm-debug.log
.git
.gitignore
README.md
.env
.DS_Store
dist
build
coverage
.vscode
```

Create `backend/.dockerignore`:
```
node_modules
npm-debug.log
.git
.gitignore
README.md
.env
.DS_Store
coverage
.vscode
logs
*.log
```

---

## 🚀 PHASE 5: Kubernetes Manifests

### Step 5.1: Create Namespace

**Objective**: Organize cluster resources

**Actions**:

Create `k8s/namespace.yaml`:
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    name: production
    environment: prod
```

Apply:
```bash
kubectl apply -f k8s/namespace.yaml
```

---

### Step 5.2: Create Frontend Deployment

**Objective**: Deploy React application

**Actions**:

Create `k8s/frontend-deployment.yaml`:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: production
  labels:
    app: frontend
    tier: presentation
spec:
  replicas: 2
  selector:
    matchLabels:
      app: frontend
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    metadata:
      labels:
        app: frontend
        tier: presentation
    spec:
      containers:
      - name: frontend
        image: PLACEHOLDER_FRONTEND_IMAGE
        imagePullPolicy: Always
        ports:
        - containerPort: 80
          name: http
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
        livenessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: frontend-service
  namespace: production
  labels:
    app: frontend
spec:
  type: LoadBalancer
  selector:
    app: frontend
  ports:
  - protocol: TCP
    port: 80
    targetPort: 80
    name: http
```

---

### Step 5.3: Create Backend Deployment

**Objective**: Deploy Node.js application

**Actions**:

Create `k8s/backend-deployment.yaml`:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: production
  labels:
    app: backend
    tier: application
spec:
  replicas: 2
  selector:
    matchLabels:
      app: backend
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    metadata:
      labels:
        app: backend
        tier: application
    spec:
      containers:
      - name: backend
        image: PLACEHOLDER_BACKEND_IMAGE
        imagePullPolicy: Always
        ports:
        - containerPort: 5000
          name: http
        env:
        - name: NODE_ENV
          value: "production"
        - name: PORT
          value: "5000"
        resources:
          requests:
            memory: "256Mi"
            cpu: "200m"
          limits:
            memory: "512Mi"
            cpu: "400m"
        livenessProbe:
          httpGet:
            path: /health
            port: 5000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 5000
          initialDelaySeconds: 10
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: backend-service
  namespace: production
  labels:
    app: backend
spec:
  type: ClusterIP
  selector:
    app: backend
  ports:
  - protocol: TCP
    port: 5000
    targetPort: 5000
    name: http
```

**✅ Validation**:
```bash
# Dry run
kubectl apply -f k8s/frontend-deployment.yaml --dry-run=client
kubectl apply -f k8s/backend-deployment.yaml --dry-run=client
```

---

## 🚀 PHASE 6: Jenkins CI/CD Pipeline

### Step 6.1: Create Jenkinsfile

**Objective**: Automate build and deployment

**Actions**:

Create `Jenkinsfile` in repository root:
```groovy
pipeline {
    agent any
    
    environment {
        AWS_REGION = 'ap-south-1'
        AWS_ACCOUNT_ID = 'YOUR_AWS_ACCOUNT_ID'
        CLUSTER_NAME = 'production-cluster'
        ECR_FRONTEND = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/react-frontend"
        ECR_BACKEND = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/node-backend"
        IMAGE_TAG = "${BUILD_NUMBER}"
        NAMESPACE = 'production'
    }
    
    stages {
        stage('Checkout') {
            steps {
                echo 'Checking out code from Git...'
                checkout scm
            }
        }
        
        stage('ECR Login') {
            steps {
                script {
                    echo 'Logging into Amazon ECR...'
                    sh '''
                        aws ecr get-login-password --region ${AWS_REGION} | \
                        docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com
                    '''
                }
            }
        }
        
        stage('Build Docker Images') {
            parallel {
                stage('Build Frontend') {
                    steps {
                        script {
                            echo 'Building frontend Docker image...'
                            sh '''
                                cd frontend
                                docker build -t frontend:${IMAGE_TAG} .
                                docker tag frontend:${IMAGE_TAG} ${ECR_FRONTEND}:${IMAGE_TAG}
                                docker tag frontend:${IMAGE_TAG} ${ECR_FRONTEND}:latest
                            '''
                        }
                    }
                }
                stage('Build Backend') {
                    steps {
                        script {
                            echo 'Building backend Docker image...'
                            sh '''
                                cd backend
                                docker build -t backend:${IMAGE_TAG} .
                                docker tag backend:${IMAGE_TAG} ${ECR_BACKEND}:${IMAGE_TAG}
                                docker tag backend:${IMAGE_TAG} ${ECR_BACKEND}:latest
                            '''
                        }
                    }
                }
            }
        }
        
        stage('Push to ECR') {
            parallel {
                stage('Push Frontend') {
                    steps {
                        script {
                            echo 'Pushing frontend image to ECR...'
                            sh '''
                                docker push ${ECR_FRONTEND}:${IMAGE_TAG}
                                docker push ${ECR_FRONTEND}:latest
                            '''
                        }
                    }
                }
                stage('Push Backend') {
                    steps {
                        script {
                            echo 'Pushing backend image to ECR...'
                            sh '''
                                docker push ${ECR_BACKEND}:${IMAGE_TAG}
                                docker push ${ECR_BACKEND}:latest
                            '''
                        }
                    }
                }
            }
        }
        
        stage('Deploy to EKS') {
            steps {
                script {
                    echo 'Deploying to Kubernetes...'
                    sh '''
                        # Update kubeconfig
                        aws eks update-kubeconfig --region ${AWS_REGION} --name ${CLUSTER_NAME}
                        
                        # Apply namespace (if not exists)
                        kubectl apply -f k8s/namespace.yaml
                        
                        # Update image in deployments
                        kubectl set image deployment/frontend \
                            frontend=${ECR_FRONTEND}:${IMAGE_TAG} \
                            -n ${NAMESPACE}
                        
                        kubectl set image deployment/backend \
                            backend=${ECR_BACKEND}:${IMAGE_TAG} \
                            -n ${NAMESPACE}
                        
                        # Wait for rollout
                        kubectl rollout status deployment/frontend -n ${NAMESPACE}
                        kubectl rollout status deployment/backend -n ${NAMESPACE}
                    '''
                }
            }
        }
        
        stage('Verify Deployment') {
            steps {
                script {
                    echo 'Verifying deployment...'
                    sh '''
                        kubectl get deployments -n ${NAMESPACE}
                        kubectl get pods -n ${NAMESPACE}
                        kubectl get services -n ${NAMESPACE}
                    '''
                }
            }
        }
        
        stage('Cleanup Local Images') {
            steps {
                script {
                    echo 'Cleaning up local Docker images...'
                    sh '''
                        docker rmi frontend:${IMAGE_TAG} || true
                        docker rmi backend:${IMAGE_TAG} || true
                        docker rmi ${ECR_FRONTEND}:${IMAGE_TAG} || true
                        docker rmi ${ECR_BACKEND}:${IMAGE_TAG} || true
                    '''
                }
            }
        }
    }
    
    post {
        success {
            echo 'Pipeline executed successfully!'
            echo "Frontend URL: http://$(kubectl get service frontend-service -n ${NAMESPACE} -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')"
        }
        failure {
            echo 'Pipeline failed!'
        }
        always {
            echo 'Cleaning up workspace...'
            cleanWs()
        }
    }
}
```

**✅ Validation**: Save to repository and commit

---

### Step 6.2: Initial Manual Deployment

**Objective**: Deploy applications for the first time

**Actions**:

```bash
# Apply namespace
kubectl apply -f k8s/namespace.yaml

# Update deployment YAMLs with actual ECR URIs
# Replace PLACEHOLDER_FRONTEND_IMAGE with actual ECR URI
# Replace PLACEHOLDER_BACKEND_IMAGE with actual ECR URI

# Apply deployments
kubectl apply -f k8s/frontend-deployment.yaml
kubectl apply -f k8s/backend-deployment.yaml

# Check status
kubectl get all -n production

# Get frontend URL
kubectl get service frontend-service -n production
```

**✅ Validation**:
```bash
kubectl get pods -n production
# All pods should be in Running state

kubectl get services -n production
# Note the LoadBalancer external URL
```

---

### Step 6.3: Configure Jenkins Job

**Objective**: Create CI/CD pipeline job

**Actions** (via Jenkins UI):

1. **Create New Pipeline Job**
   - Click "New Item"
   - Name: `production-deployment`
   - Type: Pipeline
   - Click OK

2. **Configure Pipeline**
   - Under "Pipeline" section
   - Definition: Pipeline script from SCM
   - SCM: Git
   - Repository URL: YOUR_GITHUB_REPO_URL
   - Credentials: Add GitHub credentials
   - Branch: */main
   - Script Path: Jenkinsfile

3. **Configure GitHub Webhook** (Optional)
   - In GitHub repo: Settings → Webhooks
   - Payload URL: http://JENKINS_IP:8080/github-webhook/
   - Content type: application/json
   - Events: Push events
   - Active: ✓

4. **Save and Build**
   - Click "Save"
   - Click "Build Now"

**✅ Validation**: Pipeline runs successfully and deploys to EKS

---

## 🚀 PHASE 7: Monitoring Setup

### Step 7.1: Install Prometheus & Grafana

**Objective**: Set up monitoring stack

**Actions**:

```bash
# Add Prometheus Helm repository
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# Create monitoring namespace
kubectl create namespace monitoring

# Install kube-prometheus-stack (includes Prometheus + Grafana)
helm install monitoring \
  prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --set prometheus.prometheusSpec.serviceMonitorSelectorNilUsesHelmValues=false \
  --set grafana.adminPassword='admin123' \
  --set prometheus.service.type=LoadBalancer \
  --set grafana.service.type=LoadBalancer
```

**✅ Validation**:
```bash
kubectl get pods -n monitoring
kubectl get services -n monitoring
```

**Expected Outcome**: All monitoring pods running, LoadBalancer services created

---

### Step 7.2: Access Monitoring Dashboards

**Objective**: Configure dashboard access

**Actions**:

```bash
# Get Grafana URL
GRAFANA_URL=$(kubectl get service monitoring-grafana \
  -n monitoring \
  -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

echo "Grafana URL: http://$GRAFANA_URL"
echo "Username: admin"
echo "Password: admin123"

# Get Prometheus URL
PROMETHEUS_URL=$(kubectl get service monitoring-kube-prometheus-prometheus \
  -n monitoring \
  -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

echo "Prometheus URL: http://$PROMETHEUS_URL:9090"
```

**Grafana Dashboard IDs to Import**:
- 3119: Kubernetes cluster monitoring
- 6417: Kubernetes cluster overview
- 8588: Kubernetes Deployment metrics
- 1860: Node Exporter Full

**✅ Validation**: 
- Access Grafana at http://GRAFANA_URL
- Login with admin/admin123
- Import dashboards
- Verify metrics are being collected

---

### Step 7.3: Configure Application Metrics (Optional)

**Objective**: Add custom application metrics

**Actions**:

Create `k8s/servicemonitor.yaml`:
```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: frontend-monitor
  namespace: production
  labels:
    app: frontend
spec:
  selector:
    matchLabels:
      app: frontend
  endpoints:
  - port: http
    interval: 30s
---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: backend-monitor
  namespace: production
  labels:
    app: backend
spec:
  selector:
    matchLabels:
      app: backend
  endpoints:
  - port: http
    interval: 30s
```

Apply:
```bash
kubectl apply -f k8s/servicemonitor.yaml
```

---

## 🚀 PHASE 8: Testing & Verification

### Step 8.1: End-to-End Testing

**Objective**: Verify complete deployment

**Test Checklist**:

```bash
# 1. Check all pods are running
kubectl get pods -n production
kubectl get pods -n monitoring

# 2. Check services
kubectl get services -n production
kubectl get services -n monitoring

# 3. Get frontend URL
FRONTEND_URL=$(kubectl get service frontend-service \
  -n production \
  -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

echo "Frontend URL: http://$FRONTEND_URL"

# 4. Test frontend
curl -I http://$FRONTEND_URL

# 5. Test backend (from within cluster)
kubectl run -it --rm debug \
  --image=curlimages/curl \
  --restart=Never \
  -n production \
  -- curl http://backend-service:5000/health

# 6. Check logs
kubectl logs -l app=frontend -n production --tail=50
kubectl logs -l app=backend -n production --tail=50

# 7. Test CI/CD
# Push code change to GitHub
# Watch Jenkins pipeline
# Verify automatic deployment
```

**✅ Validation**: All tests pass, application accessible

---

### Step 8.2: Performance Testing

**Objective**: Verify system under load

**Actions**:

```bash
# Install Apache Bench (if not installed)
sudo apt-get install apache2-utils -y

# Load test frontend
ab -n 1000 -c 10 http://$FRONTEND_URL/

# Monitor during load test
kubectl top nodes
kubectl top pods -n production
```

**Expected Outcome**: System handles load without crashes

---

## 🚀 PHASE 9: Production Readiness

### Step 9.1: Security Hardening

**Actions**:

1. **Update Security Groups**
```bash
# Restrict Jenkins access to specific IPs
aws ec2 revoke-security-group-ingress \
  --group-id $JENKINS_SG \
  --protocol tcp \
  --port 8080 \
  --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
  --group-id $JENKINS_SG \
  --protocol tcp \
  --port 8080 \
  --cidr YOUR_OFFICE_IP/32
```

2. **Enable Pod Security Policies**
```bash
kubectl apply -f - <<EOF
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: restricted
spec:
  privileged: false
  allowPrivilegeEscalation: false
  requiredDropCapabilities:
    - ALL
  volumes:
    - 'configMap'
    - 'emptyDir'
    - 'projected'
    - 'secret'
    - 'downwardAPI'
  hostNetwork: false
  hostIPC: false
  hostPID: false
  runAsUser:
    rule: 'MustRunAsNonRoot'
  seLinux:
    rule: 'RunAsAny'
  fsGroup:
    rule: 'RunAsAny'
EOF
```

3. **Configure Network Policies**
```bash
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: backend-network-policy
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: backend
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: frontend
    ports:
    - protocol: TCP
      port: 5000
EOF
```

---

### Step 9.2: Backup Strategy

**Actions**:

```bash
# Install Velero for cluster backups
wget https://github.com/vmware-tanzu/velero/releases/latest/download/velero-linux-amd64.tar.gz
tar -xvf velero-linux-amd64.tar.gz
sudo mv velero-linux-amd64/velero /usr/local/bin/

# Create S3 bucket for backups
aws s3 mb s3://eks-cluster-backups-$(date +%s) --region $AWS_REGION

# Configure Velero (requires additional IAM setup)
# Follow: https://velero.io/docs/main/contributions/aws-config/
```

---

### Step 9.3: Enable Autoscaling

**Actions**:

1. **Install Cluster Autoscaler**
```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/autoscaler/master/cluster-autoscaler/cloudprovider/aws/examples/cluster-autoscaler-autodiscover.yaml

kubectl -n kube-system \
  annotate deployment.apps/cluster-autoscaler \
  cluster-autoscaler.kubernetes.io/safe-to-evict="false"

kubectl -n kube-system \
  set image deployment.apps/cluster-autoscaler \
  cluster-autoscaler=k8s.gcr.io/autoscaling/cluster-autoscaler:v1.21.0
```

2. **Configure HPA for Frontend**
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: frontend-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: frontend
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

Apply:
```bash
kubectl apply -f k8s/frontend-hpa.yaml
```

---

## 📊 Final Verification Checklist

Before going to production:

- [ ] VPC and networking configured correctly
- [ ] IAM roles and permissions set up
- [ ] ECR repositories created
- [ ] Jenkins server running and configured
- [ ] EKS cluster operational with 2+ nodes
- [ ] Frontend and backend deployed successfully
- [ ] Jenkins pipeline working end-to-end
- [ ] Prometheus collecting metrics
- [ ] Grafana dashboards configured
- [ ] Load balancer accessible from internet
- [ ] SSL/TLS certificates configured (if required)
- [ ] Security groups properly restricted
- [ ] Monitoring and alerting set up
- [ ] Backup strategy in place
- [ ] Autoscaling configured
- [ ] Documentation updated
- [ ] Team trained on deployment process

---

## 🎯 Post-Deployment Operations

### Daily Operations

```bash
# Check cluster health
kubectl get nodes
kubectl get pods --all-namespaces

# View logs
kubectl logs -f deployment/frontend -n production
kubectl logs -f deployment/backend -n production

# Monitor resources
kubectl top nodes
kubectl top pods -n production
```

### Scaling

```bash
# Scale deployments manually
kubectl scale deployment frontend --replicas=5 -n production
kubectl scale deployment backend --replicas=3 -n production

# Check autoscaling
kubectl get hpa -n production
```

### Rollback

```bash
# View deployment history
kubectl rollout history deployment/frontend -n production

# Rollback to previous version
kubectl rollout undo deployment/frontend -n production

# Rollback to specific revision
kubectl rollout undo deployment/frontend --to-revision=2 -n production
```

### Updates

```bash
# Update single deployment
kubectl set image deployment/frontend \
  frontend=NEW_IMAGE_URI \
  -n production

# Watch rollout
kubectl rollout status deployment/frontend -n production
```

---

## 🆘 Troubleshooting Guide

### Pods not starting

```bash
# Check pod status
kubectl describe pod POD_NAME -n production

# Check events
kubectl get events -n production --sort-by='.lastTimestamp'

# Check logs
kubectl logs POD_NAME -n production
```

### Service not accessible

```bash
# Check service
kubectl get svc -n production
kubectl describe svc SERVICE_NAME -n production

# Check endpoints
kubectl get endpoints -n production

# Test from within cluster
kubectl run -it --rm debug \
  --image=curlimages/curl \
  --restart=Never \
  -- curl http://SERVICE_NAME:PORT
```

### Jenkins pipeline failing

```bash
# Check Jenkins logs
sudo journalctl -u jenkins -f

# Verify IAM permissions
aws sts get-caller-identity

# Test ECR login
aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin $ECR_URI
```

### High resource usage

```bash
# Check resource usage
kubectl top pods -n production
kubectl top nodes

# Describe pod for limits
kubectl describe pod POD_NAME -n production

# Check HPA status
kubectl get hpa -n production
kubectl describe hpa HPA_NAME -n production
```

---

## 📝 Environment Variables Reference

Save these for future reference:

```bash
# AWS Configuration
AWS_REGION="ap-south-1"
AWS_ACCOUNT_ID="YOUR_ACCOUNT_ID"

# Network
VPC_ID="vpc-xxxxx"
PUBLIC_SUBNET_1="subnet-xxxxx"
PUBLIC_SUBNET_2="subnet-xxxxx"
PRIVATE_SUBNET_1="subnet-xxxxx"
PRIVATE_SUBNET_2="subnet-xxxxx"

# EKS
CLUSTER_NAME="production-cluster"

# ECR
FRONTEND_ECR_URI="xxxxx.dkr.ecr.ap-south-1.amazonaws.com/react-frontend"
BACKEND_ECR_URI="xxxxx.dkr.ecr.ap-south-1.amazonaws.com/node-backend"

# Jenkins
JENKINS_PUBLIC_IP="x.x.x.x"

# Monitoring
GRAFANA_URL="xxxxx.elb.amazonaws.com"
PROMETHEUS_URL="xxxxx.elb.amazonaws.com:9090"
```

---

## 🎓 Conclusion

You now have a production-ready deployment with:

✅ Containerized React frontend and Node.js backend  
✅ Kubernetes orchestration on AWS EKS  
✅ Automated CI/CD with Jenkins  
✅ Comprehensive monitoring with Prometheus & Grafana  
✅ Secure networking with VPC and security groups  
✅ Autoscaling capabilities  
✅ Production-grade architecture  

**Next Steps:**
1. Set up SSL/TLS certificates
2. Configure custom domain
3. Implement advanced monitoring and alerting
4. Set up disaster recovery plan
5. Optimize costs with Reserved Instances

---

## 📚 Additional Resources

- [AWS EKS Documentation](https://docs.aws.amazon.com/eks/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Jenkins Documentation](https://www.jenkins.io/doc/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)

---

**Document Version**: 1.0  
**Last Updated**: 2026  
**Maintained By**: DevOps Team
