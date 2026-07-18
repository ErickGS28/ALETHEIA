'use strict';

const express = require('express');
const { ExpressAdapter } = require('ask-sdk-express-adapter');
const { skillInstance } = require('./index');

const app = express();

// Signature and timestamp verification enabled (required for Alexa self-hosted endpoints).
// IMPORTANT: no global body parser — the adapter needs the raw request body to verify the signature.
const adapter = new ExpressAdapter(skillInstance, true, true);

app.post('/', adapter.getRequestHandlers());

app.get('/health', (req, res) => res.status(200).json({ ok: true }));

const port = process.env.PORT ?? 4021;
app.listen(port, () => {
  console.log(`ALETHEIA Alexa skill endpoint listening on port ${port}`);
});
