set dotenv-load := true

# Path to the Obsidian vault to install into. Set OBSIDIAN_VAULT in your
# environment or in a local .env file (see .env.example).
vault := env_var_or_default("OBSIDIAN_VAULT", "")
plugin_dir := vault / ".obsidian/plugins/ccc-search"

# Install dependencies
install:
    bun install

# Type check without emitting
check:
    bun run check

# Build main.js for production (type check + esbuild)
build:
    bun run build

# Watch-mode development build
dev:
    bun run dev

# Copy the built plugin into the vault (enabling it in Obsidian is manual)
install-vault: build
    #!/usr/bin/env bash
    set -euo pipefail
    if [ -z "{{vault}}" ]; then
        echo "OBSIDIAN_VAULT is not set. Set it in your environment or copy .env.example to .env." >&2
        exit 1
    fi
    mkdir -p "{{plugin_dir}}"
    cp main.js manifest.json styles.css "{{plugin_dir}}/"
