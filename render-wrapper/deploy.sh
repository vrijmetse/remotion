#!/bin/bash
set -euo pipefail

# ─────────────────────────────────────────────
# Config — edit these to match your setup
# ─────────────────────────────────────────────
FUNCTION_NAME="remotion-render-wrapper"
REGION="${REMOTION_REGION:-ap-southeast-1}"
RUNTIME="nodejs20.x"
TIMEOUT=120
MEMORY=512
HANDLER="index.handler"

# These MUST be set before running this script
: "${REMOTION_SERVE_URL:?Set REMOTION_SERVE_URL (output of deploySite())}"
: "${REMOTION_FUNCTION_NAME:?Set REMOTION_FUNCTION_NAME (e.g. remotion-render-4-0-428-mem2048mb-disk2048mb-120sec)}"
: "${LAMBDA_ROLE_ARN:?Set LAMBDA_ROLE_ARN (IAM role ARN for this wrapper Lambda)}"

# ─────────────────────────────────────────────
# Build
# ─────────────────────────────────────────────
echo "📦 Installing dependencies..."
npm ci --omit=dev

echo "🔨 Building TypeScript..."
npx tsc

# ─────────────────────────────────────────────
# Package — zip dist/ + node_modules/
# ─────────────────────────────────────────────
echo "📁 Packaging..."
rm -f render-wrapper.zip

cd dist
zip -r ../render-wrapper.zip . -q
cd ..

# Add node_modules (only production deps)
zip -r render-wrapper.zip node_modules -q

ZIP_SIZE=$(du -h render-wrapper.zip | cut -f1)
echo "   Zip size: ${ZIP_SIZE}"

# ─────────────────────────────────────────────
# Deploy — create or update
# ─────────────────────────────────────────────
ENV_VARS="Variables={REMOTION_SERVE_URL=${REMOTION_SERVE_URL},REMOTION_FUNCTION_NAME=${REMOTION_FUNCTION_NAME},REMOTION_REGION=${REGION}}"

if aws lambda get-function --function-name "$FUNCTION_NAME" --region "$REGION" &>/dev/null; then
  echo "🔄 Updating existing function: ${FUNCTION_NAME}..."
  aws lambda update-function-code \
    --function-name "$FUNCTION_NAME" \
    --zip-file "fileb://render-wrapper.zip" \
    --region "$REGION" \
    --no-cli-pager

  # Wait for update to complete before changing config
  aws lambda wait function-updated --function-name "$FUNCTION_NAME" --region "$REGION"

  aws lambda update-function-configuration \
    --function-name "$FUNCTION_NAME" \
    --timeout "$TIMEOUT" \
    --memory-size "$MEMORY" \
    --environment "$ENV_VARS" \
    --region "$REGION" \
    --no-cli-pager
else
  echo "🆕 Creating new function: ${FUNCTION_NAME}..."
  aws lambda create-function \
    --function-name "$FUNCTION_NAME" \
    --runtime "$RUNTIME" \
    --handler "$HANDLER" \
    --role "$LAMBDA_ROLE_ARN" \
    --zip-file "fileb://render-wrapper.zip" \
    --timeout "$TIMEOUT" \
    --memory-size "$MEMORY" \
    --environment "$ENV_VARS" \
    --region "$REGION" \
    --no-cli-pager
fi

echo ""
echo "✅ Deployed: ${FUNCTION_NAME}"
echo "   Region:   ${REGION}"
echo "   Timeout:  ${TIMEOUT}s"
echo "   Memory:   ${MEMORY}MB"
echo ""
echo "🔗 Point your n8n AWS Lambda node at: ${FUNCTION_NAME}"
echo ""
echo "📋 Example n8n payload (no more 'type' field needed):"
echo '   {'
echo '     "composition": "NarrationVideo",'
echo '     "inputProps": { "scenes": [...] }'
echo '   }'
