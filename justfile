vault := "/path/to/your/obsidian-vault"
plugin_dir := vault + "/.obsidian/plugins/ccc-search"

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
    mkdir -p "{{plugin_dir}}"
    cp main.js manifest.json styles.css "{{plugin_dir}}/"
