# Bob

A simple local(host) builder who likes to listen to GitHub webhooks.

## Usage Guide

### 1. Install Bob

You will also need to install the
[Signal](https://github.com/CalmDownVal/signal) peer dependency.

```sh
# using NPM
npm install @calmdownval/bob @calmdownval/signal

# using Yarn
yarn add @calmdownval/bob @calmdownval/signal
```

### 2. Register GitHub Webhooks

This package is intended to be used on localhost without the need for any public
endpoints. This is possible using proxy services like
[smee.io](https://smee.io/). Once you have a channel ready use that as your
webhook URL.

Make sure to
[set a proper secret](https://docs.github.com/en/free-pro-team@latest/developers/webhooks-and-events/securing-your-webhooks)
when registering webhooks. It is an optional feature, but when using a proxy
it is the only reliable way to ensure that events you receive are in fact from
GitHub.

### 3. Create a Listener

Create a new instance of the `Listener` class with configuration to suit your
needs.

You can use the `tls` key to pass through any options accepted by
[NodeJS' TLS Socket](https://nodejs.org/dist/latest-v15.x/docs/api/tls.html#tls_new_tls_tlssocket_socket_options),
typically certificates or `rejectUnauthorized` for development environments.

```ts
import { Listener } from '@calmdownval/bob';

const listener = new Listener({
  secret: '<your-secret>',
  sourceURL: '<webhook-proxy-url>',
  tls: {
    rejectUnauthorized: false
  }
});

```

### 4. Bind Event Handlers

Assign event handlers using the
[Signal](https://github.com/CalmDownVal/signal#adding-handlers)
library to signals provided by the `Listener` instance. The handlers receive
unmodified event payloads as they are received from GitHub. You can find
[their definitions here](https://docs.github.com/en/free-pro-team@latest/developers/webhooks-and-events/webhook-events-and-payloads).

```ts
import * as Signal from '@calmdownval/signal';

Signal.on(listener.event<any>('push'), ({ data: e }) => {
  console.log(`${e.sender.login} pushed ${e.commits.length} commits into ${e.repository.full_name}.`);
});
```

The `event` method of the `Listener` class returns a signal triggered when the
GitHub webhook specified by the first argument is invoked. If you omit this
argument or use the `Listener.ANY_EVENT` constant you will receive a signal that
triggers on *any* GitHub webhook received. This is useful if you wish to switch
between event types manually.

Using the type argument of the `event` method you can inject typings of the
event. GitHub webhook typings are out of scope of this library, instead consider
using [@octokit/webhooks-definitions](https://github.com/octokit/webhooks).
