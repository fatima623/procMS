#!/usr/bin/env bash
# Generate an SBOM + license inventory locally, mirroring the CI job.
# Usage: ./scripts/sbom.sh
set -euo pipefail

mkdir -p sbom

echo "[sbom] CycloneDX JSON…"
npx -y @cyclonedx/cyclonedx-npm@2.0.0 \
  --omit=dev --output-format=json --output-file=sbom/sbom.cdx.json

echo "[sbom] CycloneDX XML…"
npx -y @cyclonedx/cyclonedx-npm@2.0.0 \
  --omit=dev --output-format=xml --output-file=sbom/sbom.cdx.xml

echo "[sbom] License inventory (JSON + CSV)…"
npx -y license-checker-rseidelsohn@4.3.0 --production --json --out sbom/licenses.json
npx -y license-checker-rseidelsohn@4.3.0 --production --csv  --out sbom/licenses.csv

echo "[sbom] Scanning for copyleft licenses…"
if grep -EqI '(GPL|AGPL|LGPL|SSPL|BUSL)' sbom/licenses.csv; then
  echo "⚠ Copyleft or source-available licenses present:"
  grep -EI '(GPL|AGPL|LGPL|SSPL|BUSL)' sbom/licenses.csv
  echo "Review before shipping to a customer."
  exit 1
fi

echo "[sbom] ✓ Done. Artefacts in ./sbom/"
ls -lh sbom/
