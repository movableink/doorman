#! /bin/bash
# example: ./push_docker_image.sh <aws-region> <aws-account-id>.dkr.ecr.us-east-1.amazonaws.com/<company>/doorman
set -x
REGION=$1
REPOSITORY_URI=$2
REPOSITORY_DOMAIN=$(echo $REPOSITORY_URI | awk -F[/:] '{print $1}')
aws ecr get-login-password --region $REGION | docker login --username AWS --password-stdin "$REPOSITORY_DOMAIN"
TAG="$REPOSITORY_URI:$(git rev-parse head)"
docker build -f Dockerfile -t $TAG .
docker push $TAG
