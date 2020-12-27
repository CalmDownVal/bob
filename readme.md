# Bob

A simple local(host) builder who likes to listen to GitHub webhooks.

## Usage Guide

### 1. Clone the Repository and Install Dependencies

This project was built and tested with Yarn and it is therefore preferable to
always install dependencies that way. Other package managers should, however,
work as well.

### 2. Register GitHub Webhook(s)

Make sure to [set a proper secret](https://docs.github.com/en/free-pro-team@latest/developers/webhooks-and-events/securing-your-webhooks)
when registering webhooks. While optional on GitHub, it is required by
[@octokit/webhooks.js](https://github.com/octokit/webhooks.js).

This boilerplate is intended to work on localhost without the need for any
public endpoints. This is achieved by using a proxy service like
[smee.io](https://smee.io/).

### 3. Configuration

Configuration is done via a `.env` file (or by directly setting relevant
environment variables). If env variables need to be avoided for any reason, swap
the `useEnvConfig` function for `useInlineConfig` in the `service.js` file and
pass the configuration through an inline object.

| key                   | type     | default |
|-----------------------|----------|---------|
| `GITHUB_SECRET`       | string   | -       |
| `SOURCE_URL`          | string   | -       |
| `REJECT_UNAUTHORIZED` | boolean? | true    |

### 4. Define Event Handlers

Assign event handlers using the `.on` method of a `Listener` instance; Some
very basic examples are present in the `service.js` file. These handlers can
be asynchronous.

### 5. Start the Service

To start the service run `yarn start` from the command line. The service will be
managed by [PM2](https://pm2.keymetrics.io/).

Once running you can use PM2's commands to monitor the status. To stop run
`yarn stop` from the command line and the service should gracefully exit.
