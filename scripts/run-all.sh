#!/usr/bin/env bash
set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}⚖️  Agent Court — Full System${NC}"
echo "================================"

MODE="${AGENT_TRANSPORT:-direct}"
echo -e "Transport mode: ${YELLOW}${MODE}${NC}"

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env not found. Creating from .env.example...${NC}"
    cp .env.example .env
    echo "Edit .env with your keys, then re-run."
    exit 1
fi

echo ""
echo "Starting system in 4 terminals..."
echo ""

if [ "$MODE" = "axl" ]; then
    echo -e "${YELLOW}AXL mode: Make sure AXL nodes are running first!${NC}"
    echo "  bash scripts/run-axl.sh"
    echo ""
fi

echo "Terminal 1 — Orchestrator:"
echo "  cd agents && pnpm orchestrator"
echo ""
echo "Terminal 2 — Plaintiff Agent:"
echo "  cd agents && AGENT_TRANSPORT=${MODE} pnpm plaintiff"
echo ""
echo "Terminal 3 — Defendant Agent:"
echo "  cd agents && AGENT_TRANSPORT=${MODE} pnpm defendant"
echo ""
echo "Terminal 4 — Judge Agent:"
echo "  cd agents && AGENT_TRANSPORT=${MODE} pnpm judge"
echo ""
echo "Then start web UI:"
echo "  pnpm dev"
echo ""
echo "Or run all agents in one terminal (direct mode):"
echo "  cd agents && AGENT_TRANSPORT=direct pnpm all:direct"
echo ""
echo -e "${GREEN}API: http://localhost:4000${NC}"
echo -e "${GREEN}Web: http://localhost:3000${NC}"

# Optional: auto-start in direct mode
if [ "$MODE" = "direct" ] && [ "${AUTO_START:-}" = "1" ]; then
    echo ""
    echo "Auto-starting all agents..."
    cd agents
    AGENT_TRANSPORT=direct pnpm all:direct &
    sleep 2
    pnpm orchestrator &
    wait
fi
