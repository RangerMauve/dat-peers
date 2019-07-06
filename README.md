# dat-peers
An implementation of Beaker's experimental [datPeers API](https://beakerbrowser.com/docs/apis/experimental-datpeers). Pass in a hyperdrive, and it does the rest

```
npm install --save dat-peers
```

```js
const DatPeers = require('dat-peers')

const hyperdiscovery = require('hyperdiscovery')

const hyperdrive = require('hyperdrive')

const archive = hyperdrive()

const discovery = hyperdiscovery(archive, {
  extensions: DatPeers.EXTENSIONS
})

const datPeers = new DatPeers(archive)

datPeers.on('message', ({message, peer}) => {
    setTimeout(() => {
      peer.send(message)
    }, 1000)
})
```
