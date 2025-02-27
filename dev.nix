{ pkgs ? import <nixpkgs> {} }:

let
  nodejs = pkgs.nodejs_20;
  pnpm = pkgs.nodePackages.pnpm;
in pkgs.mkShell {
  buildInputs = [
    nodejs
    pnpm
    pkgs.typescript
    pkgs.sqlite
    
    # For VS Code extensions support in IDX
    pkgs.nodePackages.typescript-language-server
    pkgs.vscode-langservers-extracted # html, css, json
    pkgs.tailwindcss-language-server
    pkgs.biome
    
    # For PDF extraction
    pkgs.poppler_utils
  ];

  shellHook = ''
    echo "=== Oak Bay Bylaws Assistant Development Environment ==="
    echo "Node.js: $(node --version)"
    echo "PNPM: $(pnpm --version)"
    
    # Allow global npm installs without sudo
    mkdir -p $HOME/.npm-global
    export NPM_CONFIG_PREFIX=$HOME/.npm-global
    export PATH=$HOME/.npm-global/bin:$PATH
    
    # Set SQLite temporary directory to avoid permission issues
    export SQLITE_TMPDIR=/tmp
  '';

  # Environment variables for the project
  NEXT_PUBLIC_APP_URL = "http://localhost:3000";
}