pipeline {
    agent any

   environment {
    DOCKER_HUB_CREDS = credentials('dockerhub-creds')
    DOCKER_HUB_USER  = 'kundan333'
    APP_NAME         = 'drivecloud'
    KUBECONFIG       = '/var/jenkins_home/.kube/config'
}

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build Backend Image') {
            steps {
                dir('backend') {
                    sh "docker build -t ${DOCKER_HUB_USER}/${APP_NAME}-backend:${BUILD_NUMBER} -t ${DOCKER_HUB_USER}/${APP_NAME}-backend:latest ."
                }
            }
        }

        stage('Build Frontend Image') {
            steps {
                dir('frontend') {
                    sh "docker build -t ${DOCKER_HUB_USER}/${APP_NAME}-frontend:${BUILD_NUMBER} -t ${DOCKER_HUB_USER}/${APP_NAME}-frontend:latest ."
                }
            }
        }

        stage('Push to Docker Hub') {
            steps {
                sh "echo ${DOCKER_HUB_CREDS_PSW} | docker login -u ${DOCKER_HUB_CREDS_USR} --password-stdin"
                sh "docker push ${DOCKER_HUB_USER}/${APP_NAME}-backend:${BUILD_NUMBER}"
                sh "docker push ${DOCKER_HUB_USER}/${APP_NAME}-backend:latest"
                sh "docker push ${DOCKER_HUB_USER}/${APP_NAME}-frontend:${BUILD_NUMBER}"
                sh "docker push ${DOCKER_HUB_USER}/${APP_NAME}-frontend:latest"
            }
        }

        stage('Deploy to K3s') {
            steps {
                sh "kubectl apply -f k8s/"
                sh "kubectl rollout restart deployment/backend-deployment -n drivecloud"
                sh "kubectl rollout restart deployment/frontend-deployment -n drivecloud"
            }
        }

        stage('Verify Deployment') {
            steps {
                sh "kubectl rollout status deployment/backend-deployment -n drivecloud --timeout=120s"
                sh "kubectl rollout status deployment/frontend-deployment -n drivecloud --timeout=120s"
                echo 'Deployment successful!'
            }
        }
    }

    post {
        success {
            echo "✅ Build #${BUILD_NUMBER} deployed successfully!"
        }
        failure {
            echo "❌ Build #${BUILD_NUMBER} failed."
        }
        always {
            sh 'docker logout || true'
        }
    }
}
