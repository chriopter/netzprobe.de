# Deployment

Webhook für `deploy.netzprobe.de`.

Server:

```bash
sudo mkdir -p /var/www
git clone https://github.com/chriopter/netzprobe.git /var/www/netzprobe
openssl rand -hex 32 > /var/www/netzprobe/deploy/.secret
```

Caddy:

```caddy
deploy.netzprobe.de {
    root * /var/www/netzprobe/deploy
    php_fastcgi unix//run/php/php-fpm.sock
}

netzprobe.de {
    root * /var/www/netzprobe/dist
    file_server
}
```

GitHub Secret `DEPLOY_SECRET` muss dem Inhalt von `deploy/.secret` entsprechen.
