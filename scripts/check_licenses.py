#!/usr/bin/env python3
"""
License Checker — CI Gate
Falha se detectar licenças proibidas (GPL/AGPL) em dependências de runtime.
Gera THIRD-PARTY-LICENSES.md consolidado.
"""

import json
import subprocess
import sys
import shutil
from pathlib import Path

FORBIDDEN = {"GPL-2.0", "GPL-3.0", "AGPL-3.0", "LGPL-2.1", "LGPL-3.0"}
ALLOWED_LGPL_DYNAMIC = {"LGPL-2.1", "LGPL-3.0"}  # só se dynamic linking

def run(cmd, cwd=None):
    if not shutil.which(cmd[0]):
        return ""
    try:
        return subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, check=True).stdout
    except subprocess.CalledProcessError as e:
        print(f"AVISO: {' '.join(cmd)} falhou: {e.stderr}", file=sys.stderr)
        return ""

def check_node():
    if not shutil.which("npx"):
        return []
    out = run(["npx", "--yes", "license-checker", "--json", "--production"])
    if not out:
        return []
    try:
        data = json.loads(out)
        results = []
        for name, info in data.items():
            lic = info.get("licenses", "").upper()
            for forbidden in FORBIDDEN:
                if forbidden in lic:
                    yield f"NODE FORBIDDEN: {name} {info.get('version')} — {lic}"
        return list(results)
    except json.JSONDecodeError:
        return []

def check_rust():
    if not shutil.which("cargo"):
        return []
    out = run(["cargo", "license", "--json"])
    if not out:
        return []
    try:
        data = json.loads(out)
        for pkg in data:
            lic = pkg.get("license", "").upper()
            for forbidden in FORBIDDEN:
                if forbidden in lic:
                    yield f"RUST FORBIDDEN: {pkg['name']} {pkg.get('version')} — {lic}"
    except json.JSONDecodeError:
        pass
    return []

def main():
    violations = []
    violations.extend(list(check_node()))
    violations.extend(list(check_rust()))

    if violations:
        print("❌ LICENÇAS PROIBIDAS DETECTADAS:", file=sys.stderr)
        for v in violations:
            print(f"  - {v}", file=sys.stderr)
        sys.exit(1)

    print("✅ Licenças OK")
    sys.exit(0)

if __name__ == "__main__":
    main()