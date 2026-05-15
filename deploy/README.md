# Deployment

Webhook für `deploy.netzprobe.de`.

Server:

```bash
git clone https://github.com/chriopter/netzprobe.git /root/netzprobe
openssl rand -hex 32 > /root/netzprobe/deploy/.secret
```

Caddy:

```caddy
deploy.netzprobe.de {
    root * /root/netzprobe/deploy
    php_fastcgi unix//run/php/php-fpm.sock
}
```

GitHub Secret `DEPLOY_SECRET` muss dem Inhalt von `deploy/.secret` entsprechen.
