# Deploy: single AWS box

Target: one Ubuntu 22.04 EC2/Lightsail instance behind a domain, HTTPS via Caddy.

## One-time host setup

```bash
# install Node 20 + yarn + Caddy
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo corepack enable
sudo apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt-get update && sudo apt-get install -y caddy
```

Open ports 80, 443, 22 in the EC2 Security Group / Lightsail firewall.

Point your domain's A record at the instance's elastic/static IP.

## Deploy the app

```bash
cd /home/ubuntu
git clone https://github.com/clawdbotatg/clawd-computer.git
cd clawd-computer
yarn install
cd packages/nextjs
cp .env.example .env.local   # fill in NEXT_PUBLIC_ALCHEMY_API_KEY etc.
yarn build
```

## Wire up Caddy + systemd

```bash
# replace clawd.computer in Caddyfile with your domain first
sudo cp deploy/Caddyfile /etc/caddy/Caddyfile
sudo systemctl reload caddy

sudo cp deploy/clawd-computer.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now clawd-computer
```

Check status:
```bash
sudo systemctl status clawd-computer
sudo journalctl -u clawd-computer -f
sudo journalctl -u caddy -f
```

## Updating

```bash
cd /home/ubuntu/clawd-computer
git pull
yarn install
cd packages/nextjs && yarn build
sudo systemctl restart clawd-computer
```

## Notes

- HTTPS is required for `getUserMedia` / `getDisplayMedia`. Caddy handles certs automatically.
- Signaling WebSocket server is not built yet — when it lands, uncomment the `/ws/*` block in `Caddyfile` and add a second systemd unit on `:8080`.
- For TURN, start with Cloudflare Calls (free tier) before self-hosting `coturn`.
