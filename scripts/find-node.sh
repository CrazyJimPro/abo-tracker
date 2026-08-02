# Shared Node resolver, sourced by install.sh and start-prod.sh.
#
# Neither caller can rely on a shell profile being loaded: install.sh may run
# under `sh install.sh` and the autostart .desktop entry runs with a bare
# environment, so nvm's `node` is not on PATH in either case. This looks in the
# nvm install directory directly instead.

# Is the given binary at least the given version? (usage: node_version_ok BIN 22.18.0)
node_version_ok() {
  local version
  version=$("$1" -v 2>/dev/null) || return 1
  version=${version#v}
  [ "$(printf '%s\n%s\n' "$2" "$version" | sort -V | head -n 1)" = "$2" ]
}

# Prints the path of the newest usable node, or nothing (exit 1) if none fits.
# Usage: find_node_bin 22.18.0
find_node_bin() {
  local min=$1 candidate

  # An explicit override always wins — lets the user point at a custom build.
  if [ -n "${NODE_BIN:-}" ] && node_version_ok "$NODE_BIN" "$min"; then
    echo "$NODE_BIN"
    return 0
  fi

  # nvm versions first, newest one that satisfies the minimum. Preferred over
  # PATH because distro packages are usually the older install on these boxes.
  local nvm_dir="${NVM_DIR:-$HOME/.nvm}"
  if [ -d "$nvm_dir/versions/node" ]; then
    for candidate in $(ls -1 "$nvm_dir/versions/node" 2>/dev/null | sort -Vr); do
      candidate="$nvm_dir/versions/node/$candidate/bin/node"
      if node_version_ok "$candidate" "$min"; then
        echo "$candidate"
        return 0
      fi
    done
  fi

  candidate=$(command -v node 2>/dev/null) || true
  if [ -n "$candidate" ] && node_version_ok "$candidate" "$min"; then
    echo "$candidate"
    return 0
  fi

  return 1
}
