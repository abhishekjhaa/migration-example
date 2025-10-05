#!/bin/bash

# Run Prisma migrations using ECS task
# This script runs the migration task before deploying services

set -e

# Configuration
CLUSTER_NAME="order-management-prod"
TASK_DEFINITION="order-management-migration"
SUBNET_IDS="subnet-12345678,subnet-87654321"
SECURITY_GROUP_ID="sg-12345678"

echo "🚀 Running Prisma migrations via ECS task..."

# Run the migration task
TASK_ARN=$(aws ecs run-task \
  --cluster "$CLUSTER_NAME" \
  --task-definition "$TASK_DEFINITION" \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_IDS],securityGroups=[$SECURITY_GROUP_ID],assignPublicIp=ENABLED}" \
  --query 'tasks[0].taskArn' \
  --output text)

if [ "$TASK_ARN" = "None" ] || [ -z "$TASK_ARN" ]; then
  echo "❌ Failed to start migration task"
  exit 1
fi

echo "📋 Migration task started: $TASK_ARN"

# Wait for task to complete
echo "⏳ Waiting for migration to complete..."
aws ecs wait tasks-stopped \
  --cluster "$CLUSTER_NAME" \
  --tasks "$TASK_ARN"

# Get task exit code
EXIT_CODE=$(aws ecs describe-tasks \
  --cluster "$CLUSTER_NAME" \
  --tasks "$TASK_ARN" \
  --query 'tasks[0].containers[0].exitCode' \
  --output text)

if [ "$EXIT_CODE" = "0" ]; then
  echo "✅ Migration completed successfully!"
else
  echo "❌ Migration failed with exit code: $EXIT_CODE"
  
  # Get task logs
  echo "📋 Getting migration logs..."
  LOG_GROUP="/ecs/order-management-prod"
  LOG_STREAM="migration/migration/$(echo $TASK_ARN | cut -d'/' -f3)"
  
  aws logs get-log-events \
    --log-group-name "$LOG_GROUP" \
    --log-stream-name "$LOG_STREAM" \
    --query 'events[*].message' \
    --output text
  
  exit 1
fi

echo "🎉 Migration task completed successfully!"
echo "💡 You can now deploy your services safely."




