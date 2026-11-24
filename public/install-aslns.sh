#!/usr/bin/env bash
set -euo pipefail

REPOSITORY='https://github.com/amsoulness/amsoulness-md.git'
INSTALL_DIR="${ASLNS_INSTALL_DIR:-$HOME/amsoulness-md}"
printf '\nAmsoulness / ASLNS VPS installer\n\n'
if ! command -v apt-get >/dev/null 2>&1; then
  printf 'This installer supports Debian and Ubuntu. See the repository for manual setup.\n' >&2
  exit 1
fi
SUDO=()
if [[ "$(id -u)" != 0 ]]; then
  command -v sudo >/dev/null 2>&1 || { printf 'sudo is required to install dependencies.\n' >&2; exit 1; }
  SUDO=(sudo)
fi
if ! command -v docker >/dev/null 2>&1 || ! command -v git >/dev/null 2>&1; then
  printf 'Docker and Git are required. Install missing packages with apt? [y/N] '
  read -r answer </dev/tty
  [[ "$answer" =~ ^[Yy]$ ]] || exit 1
  "${SUDO[@]}" apt-get update
  PACKAGES=(ca-certificates)
  if ! command -v docker >/dev/null 2>&1; then PACKAGES+=(docker.io); fi
  if ! command -v git >/dev/null 2>&1; then PACKAGES+=(git); fi
  "${SUDO[@]}" apt-get install -y "${PACKAGES[@]}"
fi
if command -v systemctl >/dev/null 2>&1; then "${SUDO[@]}" systemctl start docker; fi
DOCKER=(docker)
if ! docker info >/dev/null 2>&1; then DOCKER=("${SUDO[@]}" docker); fi
"${DOCKER[@]}" info >/dev/null
if "${DOCKER[@]}" container inspect amsoulness-md >/dev/null 2>&1 || "${DOCKER[@]}" volume inspect amsoulness-data >/dev/null 2>&1; then
  printf 'An Amsoulness container or data volume already exists. Manage it manually; this installer will not overwrite it.\n' >&2
  exit 1
fi
if [[ -e "$INSTALL_DIR" ]]; then
  printf 'Directory already exists: %s\nChoose a different ASLNS_INSTALL_DIR to avoid overwriting it.\n' "$INSTALL_DIR" >&2
  exit 1
fi
git clone --depth 1 "$REPOSITORY" "$INSTALL_DIR"
cd "$INSTALL_DIR"
if [[ -e config.env ]]; then printf 'config.env already exists; refusing to overwrite.\n' >&2; exit 1; fi
printf '\nPaste your private session (hidden): '
read -rs session </dev/tty; printf '\n'
if [[ ! "$session" =~ ^(ASLNS|RGNK)~[A-Za-z0-9_=-]+$ ]]; then
  printf 'Invalid session. Generate one at https://aslns.online/session\n' >&2; exit 1
fi
printf 'Owner phone number with country code (digits only): '
read -r owner </dev/tty
[[ "$owner" =~ ^[0-9]{7,15}$ ]] || { printf 'Invalid owner number.\n' >&2; exit 1; }
umask 077
{
  printf 'SESSION=%s\nSUDO=%s\n' "$session" "$owner"
  printf 'BOT_NAME=Amsoulness\nAUTO_UPDATE=false\nTZ=Asia/Kolkata\nSQLITE_PATH=/data/bot.db\nPORT=3000\n'
} >config.env
unset session owner
"${DOCKER[@]}" build -t amsoulness-md:local .
"${DOCKER[@]}" volume create amsoulness-data >/dev/null
"${DOCKER[@]}" run -d --name amsoulness-md --restart unless-stopped --env-file config.env -v amsoulness-data:/data -p 127.0.0.1:3000:3000 amsoulness-md:local
printf '\nAmsoulness started. Health: http://127.0.0.1:3000/health\n'
printf 'View logs: docker logs --tail 100 amsoulness-md\nKeep %s/config.env private.\n' "$INSTALL_DIR"
