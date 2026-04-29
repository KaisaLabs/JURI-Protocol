#!/usr/bin/env bash
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}⚖️  Agent Court — Setup Script${NC}"
echo "================================"

# Check prerequisites
echo -e "\n${YELLOW}[1/5] Checking prerequisites...${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js not found. Please install Node.js 20+.${NC}"
    exit 1
fi

if ! command -v pnpm &> /dev/null; then
    echo -e "${RED}pnpm not found. Install: npm install -g pnpm${NC}"
    exit 1
fi

if ! command -v go &> /dev/null; then
    echo -e "${YELLOW}Go not found. Some AXL build steps may be skipped.${NC}"
    echo "Install: brew install go (macOS) or https://go.dev/dl/"
fi

echo -e "${GREEN}✓ Prerequisites OK${NC}"

# Install dependencies
echo -e "\n${YELLOW}[2/5] Installing dependencies...${NC}"
pnpm install

# Setup AXL (Gensyn)
echo -e "\n${YELLOW}[3/5] Setting up AXL nodes...${NC}"

AXL_DIR="${AXL_REPO_PATH:-../axl}"
if [ ! -d "$AXL_DIR" ]; then
    echo "Cloning AXL repository..."
    git clone https://github.com/gensyn-ai/axl.git "$AXL_DIR"
fi

echo "Building AXL node binary..."
cd "$AXL_DIR"
go build -o node ./cmd/node/ 2>/dev/null || echo "AXL build skipped (run manually if needed)"
cd - > /dev/null

# Generate keys for each agent node
echo "Generating Ed25519 keys for agents..."
for role in plaintiff defendant judge; do
    KEYFILE="agents/config/private_${role}.pem"
    if [ ! -f "$KEYFILE" ]; then
        # macOS: use Homebrew's openssl
        if command -v /opt/homebrew/opt/openssl/bin/openssl &> /dev/null; then
            /opt/homebrew/opt/openssl/bin/openssl genpkey -algorithm ed25519 -out "$KEYFILE"
        elif command -v openssl &> /dev/null; then
            openssl genpkey -algorithm ed25519 -out "$KEYFILE" 2>/dev/null || {
                echo -e "${YELLOW}⚠ Could not generate ed25519 key. Use Homebrew: brew install openssl${NC}"
                echo "Then: /opt/homebrew/opt/openssl/bin/openssl genpkey -algorithm ed25519 -out $KEYFILE"
            }
        fi
        echo "  Created $KEYFILE"
    else
        echo "  $KEYFILE already exists"
    fi
done

# Environment setup
echo -e "\n${YELLOW}[4/5] Environment setup...${NC}"
if [ ! -f .env ]; then
    cp .env.example .env
    echo -e "${YELLOW}⚠ Created .env from .env.example — EDIT IT with your keys!${NC}"
else
    echo ".env already exists"
fi

# Fund wallets (0G faucet)
echo -e "\n${YELLOW}[5/5] Funding wallets...${NC}"
echo "Visit https://faucet.0g.ai to get 0G testnet tokens."
echo "Also fund via: https://cloud.google.com/application/web3/faucet/0g/galileo"

echo -e "\n${GREEN}✅ Setup complete!${NC}"
echo ""
echo "Next steps:"
echo "  1. Edit .env with your private keys and API credentials"
echo "  2. Start AXL nodes:    bash scripts/run-axl.sh"
echo "  3. Start agents:       pnpm agent:plaintiff  (in separate terminals)"
echo "                         pnpm agent:defendant"
echo "                         pnpm agent:judge"
echo "  4. Start web UI:       pnpm dev"
echo "  5. Deploy contract:    pnpm contract:deploy"
echo ""
echo "📅 Submission deadline: May 3, 2026 12:00 PM EDT"
echo "⚖️  Good luck at Open Agents 2026!"
