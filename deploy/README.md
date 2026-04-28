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
sudo cp deploy/clawd-signaling.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now clawd-computer clawd-signaling
```

Check status:
```bash
sudo systemctl status clawd-computer clawd-signaling
sudo journalctl -u clawd-computer -f
sudo journalctl -u clawd-signaling -f
sudo journalctl -u caddy -f
```

## Smoke test the signaling server

After Caddy is up:
```bash
# from any machine, replace with your domain
npx -y wscat -c wss://clawd.computer/ws
> {"type":"hello","id":"alice"}
< {"type":"peers","peers":[]}
```
Open a second terminal, repeat with `id: "bob"`. Alice will receive `peer_join`. Send `{"type":"signal","to":"alice","payload":{"hello":"world"}}` from bob and alice receives a relayed `signal` message.

## Updating

```bash
cd /home/ubuntu/clawd-computer
git pull
yarn install
cd packages/nextjs && yarn build
sudo systemctl restart clawd-computer clawd-signaling
```

## Notes

- HTTPS is required for `getUserMedia` / `getDisplayMedia`. Caddy handles certs automatically.
- The signaling server in `packages/signaling/` is a pure relay — it never sees media. Plain Node + `ws`, no other deps.
- For TURN (~20% of users sit behind blocked NAT), start with Cloudflare Calls (free tier) before self-hosting `coturn`.
