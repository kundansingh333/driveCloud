stage('Deploy to K3s') {
    steps {

        // Create namespace first
        sh "kubectl apply -f k8s/namespace.yaml"

        // Wait for namespace creation
        sh "sleep 10"

        // Apply secrets
        sh "kubectl apply -f k8s/backend-secrets.yaml"

        // Deploy backend
        sh "kubectl apply -f k8s/backend-deployment.yaml"

        // Deploy frontend
        sh "kubectl apply -f k8s/frontend-deployment.yaml"

        // Apply ingress
        sh "kubectl apply -f k8s/ingress.yaml"

        // Restart deployments
        sh "kubectl rollout restart deployment/backend-deployment -n drivecloud || true"

        sh "kubectl rollout restart deployment/frontend-deployment -n drivecloud || true"
    }
}
