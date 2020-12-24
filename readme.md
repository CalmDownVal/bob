# Bob

A simple builder who likes to listen to GitHub webhooks.

## Usage

1. Clone or download the repository and install dependencies. This project uses
   yarn and it's probably best if you do too, however NPM will probably manage
   to install what's needed as well.
2. Register listeners for specific event in the `./src/index.js` file.
3. Set your [GitHub secret](https://docs.github.com/en/free-pro-team@latest/developers/webhooks-and-events/securing-your-webhooks)
   and [smee.io](https://smee.io/) topic using either environment variables or
   directly inside the `./src/index.js` file. Webhooks **must** be set to the
   `application/json` content type.
4. Start the service using `yarn start` (or `npm start`). The service will be
   managed by [PM2](https://pm2.keymetrics.io/).
5. Stop the service using `yarn stop` (or `npm run stop`).
