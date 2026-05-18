# Deployment

Webhook für `deploy.netzprobe.de`.

Server:

```bash
sudo mkdir -p /var/www
git clone https://github.com/chriopter/netzprobe.git /var/www/netzprobe
openssl rand -hex 32 > /var/www/netzprobe/deploy/.secret

sudo apt update
sudo apt install -y curl git nodejs npm php-fpm caddy build-essential pkg-config
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sudo sh -s -- -y
sudo /root/.cargo/bin/rustup default stable

cd /var/www/netzprobe
sudo npm ci
sudo /root/.cargo/bin/cargo build --release --workspace
# Binary: /var/www/netzprobe/server/target/release/netzprobe-api

sudo cp /var/www/netzprobe/deploy/netzprobe-api.service /etc/systemd/system/netzprobe-api.service
sudo cp /var/www/netzprobe/deploy/netzprobe-deploy.service /etc/systemd/system/netzprobe-deploy.service
sudo systemctl daemon-reload
sudo systemctl enable --now netzprobe-api.service
```

Sudo-Regel für den Webhook:

```sudoers
www-data ALL=(root) NOPASSWD: /usr/bin/systemctl start netzprobe-deploy.service
```

Falls noch eine alte Regel auf `/var/www/netzprobe/deploy/deploy` zeigt, entfernen. Der Webhook startet nur noch die systemd-Unit.

Caddy: Beispiel siehe `deploy/Caddyfile.example`. Einen bestehenden `netzprobe.de`-Block nicht blind ersetzen, sondern `/api/*` vor dem SPA-Fallback ergänzen. `try_files` und Access-Logs bleiben erhalten.

```caddy
deploy.netzprobe.de {
    root * /var/www/netzprobe/deploy
    php_fastcgi unix//run/php/php-fpm.sock
}

netzprobe.de {
    handle /api/* {
        request_body {
            max_size 256KB
        }
        reverse_proxy 127.0.0.1:8080 {
            transport http {
                dial_timeout 2s
                response_header_timeout 10s
            }
        }
    }

    root * /var/www/netzprobe/dist
    try_files {path} /index.html
    file_server
}
```

GitHub Secret `DEPLOY_SECRET` muss dem Inhalt von `deploy/.secret` entsprechen.
