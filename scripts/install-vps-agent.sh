#!/usr/bin/env bash
# ============================================================
# VPS Agent v2 - Clean install on port 8070
# Run as root:  sudo bash install-vps-agent.sh
# ============================================================
set -euo pipefail

APP_DIR="/opt/vps-agent-v2"
APP_FILE="${APP_DIR}/vps_agent.py"
ENV_FILE="/etc/vps-agent-v2.env"
SERVICE_FILE="/etc/systemd/system/vps-agent-v2.service"
SERVICE_NAME="vps-agent-v2"
PORT="8070"

if [[ $EUID -ne 0 ]]; then
  echo "Please run as root:  sudo bash $0"
  exit 1
fi

echo "==> Checking system dependencies"

REQUIRED_PKGS=(python3 python3-venv python3-pip curl lsof openssl)
MISSING_PKGS=()

pkg_installed() {
  dpkg -s "$1" >/dev/null 2>&1
}

for pkg in "${REQUIRED_PKGS[@]}"; do
  if pkg_installed "$pkg"; then
    continue
  fi
  # python3-pip can be skipped if pip3 is available another way
  case "$pkg" in
    python3) command -v python3 >/dev/null 2>&1 && continue ;;
    curl)    command -v curl    >/dev/null 2>&1 && continue ;;
    lsof)    command -v lsof    >/dev/null 2>&1 && continue ;;
    openssl) command -v openssl >/dev/null 2>&1 && continue ;;
  esac
  MISSING_PKGS+=("$pkg")
done

if [[ ${#MISSING_PKGS[@]} -eq 0 ]]; then
  echo "    All required packages already installed. Skipping apt."
else
  echo "    Missing packages: ${MISSING_PKGS[*]}"
  echo "==> Attempting apt-get update (non-fatal)"
  APT_OPTS="-o Acquire::AllowInsecureRepositories=true -o Acquire::AllowDowngradeToInsecureRepositories=true -o APT::Get::AllowUnauthenticated=true"
  apt-get $APT_OPTS update -y || echo "    (apt update failed, continuing anyway)"
  echo "==> Installing missing packages"
  if ! apt-get $APT_OPTS install -y --no-install-recommends "${MISSING_PKGS[@]}"; then
    echo "    WARN: apt install failed for some packages."
    echo "    If python3-venv is missing, install it manually then re-run this script."
  fi
fi

echo "==> Creating ${APP_DIR}"
mkdir -p "${APP_DIR}"

echo "==> Creating Python virtualenv"
if ! python3 -m venv "${APP_DIR}/venv" 2>/dev/null; then
  echo "ERROR: 'python3 -m venv' failed. The 'python3-venv' package is missing"
  echo "       and could not be installed automatically (apt repos likely broken)."
  echo "       Try manually:"
  echo "         apt-get install -y --no-install-recommends python3-venv"
  echo "       Then re-run this script."
  exit 1
fi
"${APP_DIR}/venv/bin/pip" install --upgrade pip
"${APP_DIR}/venv/bin/pip" install flask psutil

echo "==> Generating API key (or reusing existing one)"
if [[ -f "${ENV_FILE}" ]] && grep -q '^VPS_AGENT_KEY=' "${ENV_FILE}"; then
  API_KEY=$(grep '^VPS_AGENT_KEY=' "${ENV_FILE}" | cut -d= -f2-)
  echo "    Reusing existing key from ${ENV_FILE}"
else
  API_KEY=$(openssl rand -hex 32)
  cat > "${ENV_FILE}" <<EOF
VPS_AGENT_KEY=${API_KEY}
VPS_AGENT_PORT=${PORT}
EOF
  chmod 600 "${ENV_FILE}"
  echo "    Wrote new key to ${ENV_FILE}"
fi

echo "==> Writing ${APP_FILE}"
cat > "${APP_FILE}" <<'PYEOF'
#!/usr/bin/env python3
"""VPS Agent v2 - Flask service exposing system + docker info."""
import os
import shutil
import subprocess
import time
from functools import wraps
from flask import Flask, jsonify, request

import psutil

app = Flask(__name__)
API_KEY = os.environ.get("VPS_AGENT_KEY", "")
PORT = int(os.environ.get("VPS_AGENT_PORT", "8070"))
START_TIME = time.time()

ALLOWED_ACTIONS = {"start", "stop", "restart", "remove", "logs"}


def require_key(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        key = request.headers.get("X-API-Key", "")
        if not API_KEY or key != API_KEY:
            return jsonify({"error": "Unauthorized"}), 401
        return fn(*args, **kwargs)
    return wrapper


def run_cmd(cmd, timeout=20):
    try:
        result = subprocess.run(
            cmd, capture_output=True, text=True, timeout=timeout, check=False
        )
        return result.returncode, result.stdout, result.stderr
    except subprocess.TimeoutExpired:
        return 124, "", "timeout"
    except FileNotFoundError:
        return 127, "", "command not found"


def get_uptime():
    seconds = int(time.time() - psutil.boot_time())
    days, rem = divmod(seconds, 86400)
    hours, rem = divmod(rem, 3600)
    minutes, _ = divmod(rem, 60)
    parts = []
    if days:
        parts.append(f"{days}d")
    if hours:
        parts.append(f"{hours}h")
    parts.append(f"{minutes}m")
    return " ".join(parts)


def get_disks():
    disks = []
    for part in psutil.disk_partitions(all=False):
        if not part.fstype or part.fstype in ("squashfs", "tmpfs"):
            continue
        try:
            usage = psutil.disk_usage(part.mountpoint)
        except PermissionError:
            continue
        disks.append({
            "mount": part.mountpoint,
            "total_gb": round(usage.total / (1024 ** 3), 2),
            "used_gb": round(usage.used / (1024 ** 3), 2),
            "free_gb": round(usage.free / (1024 ** 3), 2),
            "percent": usage.percent,
        })
    return disks


def get_network():
    n = psutil.net_io_counters()
    return {
        "bytes_sent_mb": round(n.bytes_sent / (1024 ** 2), 2),
        "bytes_recv_mb": round(n.bytes_recv / (1024 ** 2), 2),
        "packets_sent": n.packets_sent,
        "packets_recv": n.packets_recv,
    }


def get_services():
    services = []
    seen = set()
    for conn in psutil.net_connections(kind="inet"):
        if conn.status != psutil.CONN_LISTEN or not conn.laddr:
            continue
        port = conn.laddr.port
        if port in seen:
            continue
        seen.add(port)
        name = "unknown"
        pid = conn.pid
        if pid:
            try:
                name = psutil.Process(pid).name()
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass
        services.append({
            "port": port,
            "name": name,
            "pid": pid,
            "status": "running",
        })
    services.sort(key=lambda s: s["port"])
    return services


def get_users():
    users = []
    seen = set()
    for u in psutil.users():
        if u.name in seen:
            continue
        seen.add(u.name)
        users.append({"name": u.name, "home": f"/home/{u.name}"})
    return users


def get_recent_commands():
    cmds = []
    home_root = "/home"
    if os.path.isdir(home_root):
        for user in os.listdir(home_root):
            hist = os.path.join(home_root, user, ".bash_history")
            if os.path.isfile(hist):
                try:
                    with open(hist, "r", errors="ignore") as f:
                        lines = [l.strip() for l in f.readlines() if l.strip()]
                    for line in lines[-5:]:
                        cmds.append({"user": user, "command": line})
                except Exception:
                    pass
    return cmds[-20:]


def _parse_mem_to_mb(value):
    """Parse a docker stats memory string like '12.34MiB' or '1.2GiB' into MB."""
    try:
        v = value.strip()
        # Strip unit
        units = [
            ("GiB", 1024.0), ("MiB", 1.0), ("KiB", 1.0 / 1024.0),
            ("GB", 1000.0 / 1.024), ("MB", 1.0), ("KB", 1.0 / 1024.0),
            ("B", 1.0 / (1024.0 * 1024.0)),
        ]
        for suf, mult in units:
            if v.endswith(suf):
                num = float(v[: -len(suf)])
                return round(num * mult, 1)
        return round(float(v), 1)
    except Exception:
        return 0.0


def get_container_stats():
    """Return dict id -> {cpu_percent, mem_mb} using a single docker stats call."""
    stats = {}
    if not shutil.which("docker"):
        return stats
    code, out, _ = run_cmd([
        "docker", "stats", "--no-stream", "--no-trunc",
        "--format", "{{.ID}}|{{.CPUPerc}}|{{.MemUsage}}"
    ], timeout=15)
    if code != 0:
        return stats
    for line in out.strip().splitlines():
        parts = line.split("|")
        if len(parts) < 3:
            continue
        cid, cpu_s, mem_s = parts[0], parts[1], parts[2]
        try:
            cpu = float(cpu_s.strip().rstrip("%"))
        except Exception:
            cpu = 0.0
        # mem usage looks like "12.34MiB / 1.952GiB"
        used = mem_s.split("/")[0].strip() if "/" in mem_s else mem_s.strip()
        mem_mb = _parse_mem_to_mb(used)
        # Index by both full id and short id
        stats[cid] = {"cpu_percent": round(cpu, 2), "mem_mb": mem_mb}
        stats[cid[:12]] = stats[cid]
    return stats


def get_containers():
    if not shutil.which("docker"):
        return []
    code, out, _ = run_cmd([
        "docker", "ps", "-a",
        "--format", "{{.ID}}|{{.Names}}|{{.Status}}|{{.Ports}}"
    ])
    if code != 0:
        return []
    stats = get_container_stats()
    items = []
    for line in out.strip().splitlines():
        parts = line.split("|")
        if len(parts) < 4:
            continue
        cid, name, status, ports = parts[0], parts[1], parts[2], parts[3]
        s = stats.get(cid) or stats.get(cid[:12]) or {"cpu_percent": 0.0, "mem_mb": 0.0}
        items.append({
            "id": cid,
            "name": name,
            "status": status,
            "port": ports or "-",
            "owner": "root",
            "cpu_percent": s["cpu_percent"],
            "mem_mb": s["mem_mb"],
        })
    # Sort by CPU desc, then memory desc
    items.sort(key=lambda c: (c["cpu_percent"], c["mem_mb"]), reverse=True)
    return items


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"ok": True, "uptime_s": int(time.time() - START_TIME)})


@app.route("/status", methods=["GET"])
@require_key
def status():
    vm = psutil.virtual_memory()
    return jsonify({
        "cpu_percent": psutil.cpu_percent(interval=0.5),
        "ram_percent": vm.percent,
        "ram_used_mb": round(vm.used / (1024 ** 2), 1),
        "ram_total_mb": round(vm.total / (1024 ** 2), 1),
        "uptime": get_uptime(),
        "hostname": os.uname().nodename,
        "services": get_services(),
        "disks": get_disks(),
        "network": get_network(),
        "users": get_users(),
        "recent_commands": get_recent_commands(),
        "containers": get_containers(),
    })


@app.route("/container/<action>", methods=["POST"])
@require_key
def container_action(action):
    if action not in ALLOWED_ACTIONS:
        return jsonify({"error": f"Unknown action: {action}"}), 400
    if not shutil.which("docker"):
        return jsonify({"error": "Docker is not installed on this host"}), 500

    body = request.get_json(silent=True) or {}
    container = str(body.get("container", "")).strip()
    tail = int(body.get("tail", 200))
    tail = max(10, min(tail, 2000))

    if not container:
        return jsonify({"error": "Missing 'container'"}), 400

    if action == "logs":
        code, out, err = run_cmd(["docker", "logs", "--tail", str(tail), container], timeout=25)
        return jsonify({
            "success": code == 0,
            "output": out + (("\n" + err) if err else ""),
        })

    if action == "remove":
        cmd = ["docker", "rm", "-f", container]
    else:
        cmd = ["docker", action, container]

    code, out, err = run_cmd(cmd, timeout=25)
    return jsonify({
        "success": code == 0,
        "output": (out + err).strip() or f"{action} executed on {container}",
        **({"error": err.strip()} if code != 0 and err else {}),
    })


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=PORT)
PYEOF
chmod 644 "${APP_FILE}"

echo "==> Writing ${SERVICE_FILE}"
cat > "${SERVICE_FILE}" <<EOF
[Unit]
Description=VPS Agent v2 (port ${PORT})
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=root
EnvironmentFile=${ENV_FILE}
ExecStart=${APP_DIR}/venv/bin/python ${APP_FILE}
Restart=on-failure
RestartSec=5
StartLimitIntervalSec=60
StartLimitBurst=5

[Install]
WantedBy=multi-user.target
EOF

echo "==> Opening firewall (if ufw is active)"
if command -v ufw >/dev/null 2>&1 && ufw status | grep -q "Status: active"; then
  ufw allow ${PORT}/tcp || true
fi

echo "==> Reloading systemd & starting service"
systemctl daemon-reload
systemctl enable "${SERVICE_NAME}"
systemctl restart "${SERVICE_NAME}"
sleep 2
systemctl --no-pager --full status "${SERVICE_NAME}" | head -n 15 || true

echo
echo "==> Quick health check"
if curl -sf "http://127.0.0.1:${PORT}/health" >/dev/null; then
  echo "    OK  -> http://127.0.0.1:${PORT}/health responded"
else
  echo "    WARN -> /health did not respond. Check: journalctl -u ${SERVICE_NAME} -n 50"
fi

PUBLIC_IP=$(curl -s4 ifconfig.me || echo "YOUR_VPS_IP")

echo
echo "============================================================"
echo " VPS Agent v2 installed."
echo "------------------------------------------------------------"
echo "  Service : ${SERVICE_NAME}"
echo "  Port    : ${PORT}"
echo "  Env file: ${ENV_FILE}"
echo
echo "  Add these two secrets in Lovable Cloud:"
echo
echo "    VPS_AGENT_URL = http://${PUBLIC_IP}:${PORT}"
echo "    VPS_AGENT_KEY = ${API_KEY}"
echo
echo "  Test from this server:"
echo "    curl -H \"X-API-Key: ${API_KEY}\" http://127.0.0.1:${PORT}/status | head"
echo "============================================================"
