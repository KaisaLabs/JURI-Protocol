#!/usr/bin/env bash
set -euo pipefail

AXL_DIR="${AXL_REPO_PATH:-../axl}"

if [ ! -f "$AXL_DIR/node" ]; then
    echo "Building AXL node..."
    cd "$AXL_DIR" && go build -o node ./cmd/node/ && cd - > /dev/null
fi

echo "Starting 3 AXL nodes (separate terminals recommended)..."
echo ""
echo "Terminal 1 — Plaintiff (port 9001):"
echo "  cd $AXL_DIR && ./node -config $(pwd)/agents/config/plaintiff.json"
echo ""
echo "Terminal 2 — Defendant (port 9002):"
echo "  cd $AXL_DIR && ./node -config $(pwd)/agents/config/defendant.json"
echo ""
echo "Terminal 3 — Judge (port 9003):"
echo "  cd $AXL_DIR && ./node -config $(pwd)/agents/config/judge.json"
