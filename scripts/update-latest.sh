#!/usr/bin/env bash
set -euo pipefail

# Update Charlotte to the latest commit on the main branch.
# Run this script from the Charlotte repository root.

# ---------------------------------------------------------------------------
# Colour helpers — degrade gracefully when output is not a terminal.
# ---------------------------------------------------------------------------
if [ -t 1 ]; then
    RED=$(tput setaf 1)
    GREEN=$(tput setaf 2)
    YELLOW=$(tput setaf 3)
    BOLD=$(tput bold)
    RESET=$(tput sgr0)
else
    RED=""
    GREEN=""
    YELLOW=""
    BOLD=""
    RESET=""
fi

info()    { printf '%s\n' "${BOLD}${1}${RESET}"; }
success() { printf '%s\n' "${GREEN}${1}${RESET}"; }
warn()    { printf '%s\n' "${YELLOW}WARNING: ${1}${RESET}"; }
error()   { printf '%s\n' "${RED}ERROR: ${1}${RESET}" >&2; }

# ---------------------------------------------------------------------------
# Flags
# ---------------------------------------------------------------------------
SKIP_TESTS=false

for arg in "$@"; do
    case "$arg" in
        --skip-tests)
            SKIP_TESTS=true
            ;;
        *)
            error "Unknown argument: $arg"
            echo "Usage: $0 [--skip-tests]"
            exit 1
            ;;
    esac
done

# ---------------------------------------------------------------------------
# Header
# ---------------------------------------------------------------------------
echo ""
info "Charlotte — update to latest (main)"
echo ""

# ---------------------------------------------------------------------------
# Preflight checks
# ---------------------------------------------------------------------------
# Verify we are in the Charlotte repo root.
if [ ! -f "go.mod" ] || [ ! -f "docker-compose.yml" ]; then
    error "This script must be run from the Charlotte repository root."
    error "Could not find go.mod or docker-compose.yml in the current directory."
    exit 1
fi

# Verify required tools are available.
for tool in git go docker; do
    if ! command -v "$tool" &>/dev/null; then
        error "Required tool not found: $tool"
        error "Please install $tool and try again."
        exit 1
    fi
done

# ---------------------------------------------------------------------------
# Step 1: Pull latest from origin/main
# ---------------------------------------------------------------------------
info "Pulling latest from origin/main..."
git pull origin main
echo ""

# ---------------------------------------------------------------------------
# Step 2: Run tests (optional)
# ---------------------------------------------------------------------------
if [ "$SKIP_TESTS" = true ]; then
    warn "Skipping tests (--skip-tests was set)."
    echo ""
else
    info "Running tests..."
    if ! go test ./internal/... 2>&1; then
        echo ""
        error "Tests failed — aborting update. Your installation has not changed."
        exit 1
    fi
    success "All tests passed."
    echo ""
fi

# ---------------------------------------------------------------------------
# Step 3: Rebuild and restart Docker
# ---------------------------------------------------------------------------
info "Rebuilding and restarting Docker..."
docker compose up -d --build
echo ""

# ---------------------------------------------------------------------------
# Step 4: Wait for the container to start, then check logs
# ---------------------------------------------------------------------------
info "Waiting for container to start..."
sleep 5

info "Recent container logs:"
docker compose logs --tail=20 charlotte
echo ""

# ---------------------------------------------------------------------------
# Done
# ---------------------------------------------------------------------------
success "Charlotte has been updated to the latest commit on main."
success "The app is running on port 9271."
echo ""
