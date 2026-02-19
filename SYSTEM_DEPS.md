# System Dependencies

To run this autoresponder with Playwright, you may need to install system dependencies.

## Ubuntu/Debian

```bash
sudo apt-get update
sudo apt-get install -y libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 \
  libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 \
  libxrandr2 libgbm1 libpango-1.0-0 libcairo2 libasound2
```

## CentOS/RHEL/Fedora

```bash
sudo yum install -y nss nspr atk atk-bridge2.0 cups-libs libdrm \
  libxkbcommon xorg-x11-server-Xvfb libXcomposite libXdamage libXfixes \
  libXrandr mesa-libgbm pango cairo alsa-lib
```

## macOS

No additional dependencies required. Playwright works out of the box.

## Windows

No additional dependencies required. Playwright works out of the box.

## Docker

If running in a Docker container, use this base image or install the dependencies above:

```dockerfile
FROM mcr.microsoft.com/playwright:v1.41.0-jammy
```

## Installing Dependencies Automatically

Playwright can install dependencies for you:

```bash
npx playwright install-deps chromium
```

## Verifying Installation

After installing dependencies, verify Playwright works:

```bash
npx playwright test --version
```
