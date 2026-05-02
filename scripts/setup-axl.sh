#!/usr/bin/env bash
set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}🔧 JURI Protocol — AXL Setup${NC}"
echo "================================"

# Check Go
if ! command -v go &>/dev/null; then
    echo -e "${YELLOW}Go not found. Installing via Homebrew...${NC}"
    if command -v brew &>/dev/null; then
        brew install go
    else
        echo -e "${RED}Please install Go: https://go.dev/dl/${NC}"
        exit 1
    fi
fi
echo -e "${GREEN}✓ Go $(go version | awk '{print $3}')${NC}"

# Clone AXL
AXL_DIR="${1:-../axl}"
if [ ! -d "$AXL_DIR" ]; then
    echo -e "${YELLOW}Cloning Gensyn AXL...${NC}"
    git clone https://github.com/gensyn-ai/axl.git "$AXL_DIR"
fi
echo -e "${GREEN}✓ AXL cloned${NC}"

# Build
echo "Building AXL node binary..."
cd "$AXL_DIR"
go build -o node ./cmd/node/ 2>&1
echo -e "${GREEN}✓ AXL binary built: $(pwd)/node${NC}"
cd - > /dev/null

# Generate keys
echo "Generating Ed25519 identity keys..."
for role in forensic analysis verification; do
    KEYFILE="agents/config/private_${role}.pem"
    if [ ! -f "$KEYFILE" ]; then
        if command -v /opt/homebrew/opt/openssl/bin/openssl &>/dev/null; then
            /opt/homebrew/opt/openssl/bin/openssl genpkey -algorithm ed25519 -out "$KEYFILE"
        elif openssl version 2>/dev/null | grep -q "OpenSSL"; then
            openssl genpkey -algorithm ed25519 -out "$KEYFILE"
        else
            echo -e "${YELLOW}⚠ Install OpenSSL: brew install openssl${NC}"
        fi
        echo "  Created $KEYFILE"
    else
        echo "  $KEYFILE exists"
    fi
done
echo -e "${GREEN}✓ Keys generated${NC}"

echo ""
echo -e "${GREEN}✅ AXL setup complete!${NC}"
echo ""
echo "Start nodes (3 terminals):"
echo "  cd $AXL_DIR && ./node -config $(pwd)/agents/config/forensic.json"
echo "  cd $AXL_DIR && ./node -config $(pwd)/agents/config/analysis.json"
echo "  cd $AXL_DIR && ./node -config $(pwd)/agents/config/verification.json"
echo ""
echo "Then run agents with AXL transport:"
echo "  AGENT_TRANSPORT=axl pnpm agent:forensic"
echo "  AGENT_TRANSPORT=axl pnpm agent:analysis"
echo "  AGENT_TRANSPORT=axl pnpm agent:verification"
