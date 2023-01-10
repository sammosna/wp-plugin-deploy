# Wordpress plugin deploy

## Installation
Add this to your environment - for example in `~/.zshrc`
```
export WP_UPDATER_SERVER_BASE=https://your-plugin-server.ext/path
export WP_UPDATER_FTP_PASS=your-ftp-pass
export WP_UPDATER_FTP_USER=your-ftp-user
export WP_UPDATER_FTP_HOST=your-ftp-server
```

## Usage
```bash
pnpm -g install @sammosna/wp-plugin-deploy
cd /plugin/path
@sammosna/wp-plugin-deploy
```
