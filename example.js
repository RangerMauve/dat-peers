const hyperdrive = require('hyperdrive')
const hyperdiscovery = require('hyperdiscovery')
const RAM = require('random-access-memory')

// Load this Dat in Beaker to see the messages in your console!
const key = Buffer.from('24913066951ddd067d2f4477a9f5e282af5030d6c5357e1a07865ef62e695760', 'hex')

const DatPeers = require('./')
const extensions = DatPeers.EXTENSIONS

const archive1 = hyperdrive(RAM, key)
const discovery1 = hyperdiscovery(archive1, {
  extensions
})

archive1.ready(() => {
  const archive2 = hyperdrive(RAM, key)
  const discovery2 = hyperdiscovery(archive2, {
    extensions
  })

  archive2.ready(() => {
    const datPeers1 = new DatPeers(archive1)
    const datPeers2 = new DatPeers(archive2)

    discovery2.once('connection', () => {
      console.log('Got connection')

      datPeers1.addEventListener('session-data', ({ peer }) => {
        console.log('Got session data', peer.sessionData)
      })

      datPeers1.addEventListener('message', ({ message, peer }) => {
        console.log('Got message', message)
        peer.send(message)
      })

      datPeers2.addEventListener('message', ({ message }) => {
        console.log('Got response message', message)
      })

      setTimeout(() => {
        console.log('Sending message')
        datPeers2.broadcast({
          hello: 'World!'
        })

        datPeers2.setSessionData({
          hello: 'world'
        })
      }, 2000)
    })
  })
})
