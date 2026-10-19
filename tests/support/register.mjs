import { register } from 'node:module'

// Loaded with `node --import`: installs the resolve hook before any test module is read.
register('./resolve.mjs', import.meta.url)
