#!/usr/bin/env bash
# ============================================================================
# YouTube Viewer - Automated ADB Installation Script
# ============================================================================
# This script downloads the latest release APK from GitHub and installs
# it onto a connected Android device via ADB.
# Compatible with: Windows Git Bash (MINGW64 / MSYS2), macOS, and Linux.
# ============================================================================

set -uo pipefail

# Disable MSYS2 / Git Bash automatic path conversion on Windows
# Prevents /data/local/tmp from turning into C:/Program Files/Git/data/local/tmp
export MSYS_NO_PATHCONV=1
export MSYS2_ARG_CONV_EXCL="*"

REPO_OWNER="mostuf25561"
REPO_NAME="youtubenet3"
ALT_REPO_OWNER="baobabitogether-a11y"
ALT_REPO_NAME="youtubenet3"
FALLBACK_REPO_OWNER="baobabitogether1-hash"
FALLBACK_REPO_NAME="youtubenet4"
ARG_INPUT="${1:-latest}"
APK_NAME="YouTube-Viewer-debug.apk"
PACKAGE_NAME="com.ytviewer.app"
MAIN_ACTIVITY="com.ytviewer.app/.MainActivity"

# ----------------------------------------------------------------------------
# 1. Parse Input Argument (Full URL vs Tag/Version vs 'latest')
# ----------------------------------------------------------------------------
if [[ "${ARG_INPUT}" =~ ^https?:// ]]; then
  DOWNLOAD_URL="${ARG_INPUT}"
  # Extract version from URL if available, or extract file name
  if [[ "${ARG_INPUT}" =~ /releases/download/([^/]+)/ ]]; then
    VERSION="${BASH_REMATCH[1]}"
  elif [[ "${ARG_INPUT}" =~ /releases/latest/ ]]; then
    VERSION="latest"
  else
    VERSION="remote-url"
  fi
  if [[ "${ARG_INPUT}" =~ /([^/]+\.apk)$ ]]; then
    APK_NAME="${BASH_REMATCH[1]}"
  fi
  # Extract repo owner/name if from github releases
  if [[ "${ARG_INPUT}" =~ github\.com/([^/]+)/([^/]+)/releases ]]; then
    REPO_OWNER="${BASH_REMATCH[1]}"
    REPO_NAME="${BASH_REMATCH[2]}"
  fi
elif [[ "${ARG_INPUT}" == "latest" || -z "${ARG_INPUT}" ]]; then
  echo "[*] Resolving latest release from GitHub API..."
  API_RESP=$(curl -s "https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest" 2>/dev/null || true)
  VERSION=$(echo "${API_RESP}" | grep -oE '"tag_name": *"[^"]+"' | head -1 | cut -d'"' -f4)
  if [ -z "${VERSION}" ]; then
    API_RESP=$(curl -s "https://api.github.com/repos/${ALT_REPO_OWNER}/${ALT_REPO_NAME}/releases/latest" 2>/dev/null || true)
    VERSION=$(echo "${API_RESP}" | grep -oE '"tag_name": *"[^"]+"' | head -1 | cut -d'"' -f4)
    if [ -n "${VERSION}" ]; then
      REPO_OWNER="${ALT_REPO_OWNER}"
      REPO_NAME="${ALT_REPO_NAME}"
    else
      API_RESP=$(curl -s "https://api.github.com/repos/${FALLBACK_REPO_OWNER}/${FALLBACK_REPO_NAME}/releases/latest" 2>/dev/null || true)
      VERSION=$(echo "${API_RESP}" | grep -oE '"tag_name": *"[^"]+"' | head -1 | cut -d'"' -f4)
      if [ -n "${VERSION}" ]; then
        REPO_OWNER="${FALLBACK_REPO_OWNER}"
        REPO_NAME="${FALLBACK_REPO_NAME}"
      fi
    fi
  fi
  VERSION="${VERSION:-v1.0.16}"
  DOWNLOAD_URL="https://github.com/${REPO_OWNER}/${REPO_NAME}/releases/download/${VERSION}/${APK_NAME}"
else
  VERSION="${ARG_INPUT}"
  DOWNLOAD_URL="https://github.com/${REPO_OWNER}/${REPO_NAME}/releases/download/${VERSION}/${APK_NAME}"
fi

# ----------------------------------------------------------------------------
# 2. Resolve Platform Paths (Git Bash on Windows vs macOS/Linux)
# ----------------------------------------------------------------------------
if [[ "${OSTYPE:-}" == "msys"* || "${OSTYPE:-}" == "cygwin"* || "${OSTYPE:-}" == "win32"* ]]; then
  # On Windows Git Bash: normalize USERPROFILE to forward slashes for bash
  WIN_USER="${USERPROFILE:-$HOME}"
  WIN_USER="${WIN_USER//\\//}"
  DOWNLOAD_DIR="${WIN_USER}/Downloads"
else
  DOWNLOAD_DIR="${HOME}/Downloads"
fi

mkdir -p "${DOWNLOAD_DIR}"
APK_FILE="${DOWNLOAD_DIR}/${APK_NAME}"

# Compute a Windows-native path (e.g. C:\Users\User\Downloads\...) for adb.exe
if command -v cygpath &> /dev/null; then
  ADB_TARGET_PATH=$(cygpath -w "${APK_FILE}")
elif [[ "$APK_FILE" =~ ^([a-zA-Z]):/(.*) ]]; then
  DRIVE="${BASH_REMATCH[1]}"
  REST="${BASH_REMATCH[2]}"
  ADB_TARGET_PATH="${DRIVE^^}:\\${REST//\//\\}"
elif [[ "$APK_FILE" =~ ^/([a-zA-Z])/(.*) ]]; then
  DRIVE="${BASH_REMATCH[1]}"
  REST="${BASH_REMATCH[2]}"
  ADB_TARGET_PATH="${DRIVE^^}:\\${REST//\//\\}"
else
  ADB_TARGET_PATH="${APK_FILE}"
fi

echo "================================================================"
echo "   YouTube Viewer - Automated ADB Installation Script"
echo "================================================================"
echo " Repository  : ${REPO_OWNER}/${REPO_NAME}"
echo " Version Tag : ${VERSION}"
echo " APK Name    : ${APK_NAME}"
echo " Target Path : ${APK_FILE}"
echo " ADB Path    : ${ADB_TARGET_PATH}"
echo " Package     : ${PACKAGE_NAME}"
echo " Download URL: ${DOWNLOAD_URL}"
echo "================================================================"
echo ""

# ----------------------------------------------------------------------------
# 2. Check and Locate ADB
# ----------------------------------------------------------------------------
if ! command -v adb &> /dev/null; then
  FOUND_ADB=""
  # Check standard Android SDK locations on Windows
  if [ -n "${LOCALAPPDATA:-}" ] && [ -f "${LOCALAPPDATA//\\//}/Android/Sdk/platform-tools/adb.exe" ]; then
    FOUND_ADB="${LOCALAPPDATA//\\//}/Android/Sdk/platform-tools"
  elif [ -f "/c/Users/${USER:-User}/AppData/Local/Android/Sdk/platform-tools/adb.exe" ]; then
    FOUND_ADB="/c/Users/${USER:-User}/AppData/Local/Android/Sdk/platform-tools"
  elif [ -d "$HOME/Android/Sdk/platform-tools" ]; then
    FOUND_ADB="$HOME/Android/Sdk/platform-tools"
  fi

  if [ -n "$FOUND_ADB" ]; then
    export PATH="${FOUND_ADB}:${PATH}"
    echo "[+] Found ADB at: ${FOUND_ADB}"
  else
    echo "[ERROR] 'adb' command not found in your PATH."
    echo "Please ensure Android platform-tools is installed or adb is in PATH."
    exit 1
  fi
fi

# ----------------------------------------------------------------------------
# 3. Check Connected ADB Devices
# ----------------------------------------------------------------------------
echo "[*] Checking connected ADB devices..."
adb devices
echo ""

# Parse attached devices in 'device' state
DEVICE_ID=$(adb devices | awk 'NR>1 && $2=="device" {print $1; exit}')

if [ -n "$DEVICE_ID" ]; then
  echo "[+] Target Android device selected: ${DEVICE_ID}"
  ADB_CMD="adb -s ${DEVICE_ID}"
else
  # Check if unauthorized or offline
  UNAUTH=$(adb devices | awk 'NR>1 && ($2=="unauthorized" || $2=="offline") {print $1; exit}')
  if [ -n "$UNAUTH" ]; then
    echo "[WARNING] Device ${UNAUTH} is detected but UNAUTHORIZED or OFFLINE."
    echo "Please check your phone screen and allow 'USB Debugging' prompt."
  else
    echo "[WARNING] No device detected in 'device' mode. Proceeding with default adb target."
  fi
  ADB_CMD="adb"
fi
echo ""

# ----------------------------------------------------------------------------
# 4. Clean & Download Latest APK
# ----------------------------------------------------------------------------
echo "[*] Cleaning up old download: ${APK_FILE}"
rm -f "${APK_FILE}" 2>/dev/null || true

echo "[*] Downloading ${APK_NAME} (${VERSION})..."
if ! curl -f -L --progress-bar "${DOWNLOAD_URL}" --output "${APK_FILE}"; then
  echo "[ERROR] Failed to download APK from: ${DOWNLOAD_URL}"
  echo "Verify your internet connection and that release ${VERSION} exists."
  exit 1
fi

# Verify file exists and has size > 100 KB
if [ ! -s "${APK_FILE}" ]; then
  echo "[ERROR] Download failed: ${APK_FILE} is missing or empty."
  exit 1
fi

FILE_SIZE=$(wc -c < "${APK_FILE}" | tr -dc '0-9')
if [ "${FILE_SIZE:-0}" -lt 100000 ]; then
  echo "[ERROR] Downloaded file is too small (${FILE_SIZE} bytes). It may be an HTTP error response."
  exit 1
fi
echo "[+] Download complete (${FILE_SIZE} bytes)."
echo ""

# ----------------------------------------------------------------------------
# 5. Uninstall Existing App from Device (Clean Slate)
# ----------------------------------------------------------------------------
echo "[*] Uninstalling existing ${PACKAGE_NAME} from device..."
UNINSTALL_RES=$($ADB_CMD uninstall "${PACKAGE_NAME}" 2>&1 || true)
echo "${UNINSTALL_RES}"
if echo "${UNINSTALL_RES}" | grep -iq "Success"; then
  echo "[+] Existing version removed."
else
  echo "[i] Clean state: previous version was not present or already removed."
fi
echo ""

# ----------------------------------------------------------------------------
# 6. Install New APK to Device
# ----------------------------------------------------------------------------
echo "[*] Installing APK to device (${ADB_TARGET_PATH})..."
INSTALL_SUCCESS=false

# Method 1: Standard adb install with replace (-r), allow downgrade (-d), and test (-t)
# Note: We intentionally avoid -g (INSTALL_GRANT_RUNTIME_PERMISSIONS) because
# vendor ROMs (MIUI, HyperOS, ColorOS, Knox) reject it with SecurityException
INSTALL_OUTPUT=$($ADB_CMD install -r -d -t "${ADB_TARGET_PATH}" 2>&1 || true)
echo "${INSTALL_OUTPUT}"

if echo "${INSTALL_OUTPUT}" | grep -iq "Success"; then
  INSTALL_SUCCESS=true
fi

# Method 2: If native Windows path fails, try bash POSIX path
if [ "$INSTALL_SUCCESS" = false ]; then
  echo "[!] Retrying installation with POSIX path (${APK_FILE})..."
  INSTALL_OUTPUT_2=$($ADB_CMD install -r -d -t "${APK_FILE}" 2>&1 || true)
  echo "${INSTALL_OUTPUT_2}"
  if echo "${INSTALL_OUTPUT_2}" | grep -iq "Success"; then
    INSTALL_SUCCESS=true
  fi
fi

# Method 3: Push to device temp directory and run pm install
# Using //data/local/tmp/ prevents any MSYS path conversion in Git Bash
if [ "$INSTALL_SUCCESS" = false ]; then
  echo "[!] Retrying via direct ADB push to //data/local/tmp/..."
  $ADB_CMD shell rm -f //data/local/tmp/app-install.apk 2>/dev/null || true
  
  PUSH_OUTPUT=$($ADB_CMD push "${ADB_TARGET_PATH}" //data/local/tmp/app-install.apk 2>&1 || true)
  echo "${PUSH_OUTPUT}"
  if ! echo "${PUSH_OUTPUT}" | grep -iq "pushed"; then
    $ADB_CMD push "${APK_FILE}" //data/local/tmp/app-install.apk 2>&1 || true
  fi

  INSTALL_OUTPUT_3=$($ADB_CMD shell pm install -r -d -t //data/local/tmp/app-install.apk 2>&1 || true)
  echo "${INSTALL_OUTPUT_3}"
  $ADB_CMD shell rm -f //data/local/tmp/app-install.apk 2>/dev/null || true

  if echo "${INSTALL_OUTPUT_3}" | grep -iq "Success"; then
    INSTALL_SUCCESS=true
  fi
fi

# Method 4: Retry with --user 0 for multi-profile/work profile devices
if [ "$INSTALL_SUCCESS" = false ]; then
  echo "[!] Retrying with --user 0 flag..."
  INSTALL_OUTPUT_4=$($ADB_CMD install --user 0 -r -d -t "${ADB_TARGET_PATH}" 2>&1 || true)
  echo "${INSTALL_OUTPUT_4}"
  if echo "${INSTALL_OUTPUT_4}" | grep -iq "Success"; then
    INSTALL_SUCCESS=true
  fi
fi

if [ "$INSTALL_SUCCESS" = false ]; then
  echo ""
  echo "[ERROR] APK installation failed. Check ADB device connection and log above."
  exit 1
fi

echo "[+] APK installed successfully!"
echo ""

# ----------------------------------------------------------------------------
# 7. Launch Main Activity on Device
# ----------------------------------------------------------------------------
echo "[*] Launching ${MAIN_ACTIVITY} on device..."
LAUNCH_OUTPUT=$($ADB_CMD shell am start -n "${MAIN_ACTIVITY}" 2>&1 || true)
echo "${LAUNCH_OUTPUT}"
echo ""

echo "================================================================"
echo "   INSTALLATION COMPLETE! Application is running on device."
echo "================================================================"
