const EventTarget = require('@ungap/event-target')
const { EphemeralMessage } = require('@beaker/dat-ephemeral-ext-msg/encodings')
const debug = require('debug')('dat-peers')

const EPHEMERAL_TYPE = 'ephemeral'
const SESSION_DATA_TYPE = 'session-data'
const EXTENSIONS = [EPHEMERAL_TYPE, SESSION_DATA_TYPE]

class DatPeers extends EventTarget {
  constructor (archive) {
    super()
    this.archive = archive

    this.archive.on('extension', (name, message, datPeer) => {
      if (name === EPHEMERAL_TYPE) {
        try {
          const decoded = EphemeralMessage.decode(message)

          let { payload } = decoded

          try {
            payload = JSON.parse(payload)
          } catch (e) {
            debug('Error parsing ephemeral message', e)
          }

          const type = 'message'
          const peer = this._getPeer(datPeer)
          const event = {
            type, peer, message: payload
          }

          this.dispatchEvent(event)
        } catch (e) {
          debug('Error sending ephemeral message', e)
        }
      } else if (name === SESSION_DATA_TYPE) {
        try {
          const stringData = message.toString('utf8')
          const sessionData = JSON.parse(stringData)
          datPeer.sessionData = sessionData
          const type = 'session-data'
          const peer = this._getPeer(datPeer)
          const event = { type, peer }
          this.dispatchEvent(event)
        } catch (e) {
          debug('Error parsing session data', e)
        }
      }
    })

    this._on_peer_add = (datPeer) => {
      if (this.sessionData) {
        this.broadcastSessionData()
      }

      const type = 'connect'
      const peer = this._getPeer(datPeer)

      const event = {
        type, peer
      }

      this.dispatchEvent(event)
    }

    this._on_peer_remove = (datPeer) => {
      const type = 'connect'
      const peer = this._getPeer(datPeer)

      const event = {
        type, peer
      }

      this.dispatchEvent(event)
    }

    archive.on('peer-add', this._on_peer_add)
    archive.on('peer-remove', this._on_peer_remove)
  }

  _getPeer (peer) {
    return new DatPeer(peer)
  }

  async getSessionData () {
    return this.sessionData
  }

  async setSessionData (sessionData) {
    const data = Buffer.from(JSON.stringify(sessionData), 'utf8')

    this.sessionData = data
    await this.broadcastSessionData()
  }

  async broadcastSessionData () {
    this.archive.extension(SESSION_DATA_TYPE, this.sessionData)
  }

  async list () {
    const peers = this.peers

    return peers.map((peer) => this._getPeer(peer))
  }

  async get (id) {
    const stringId = id.toString('hex')
    return (await this.list()).filter((peer) => {
      return peer.id === stringId
    })[0]
  }

  async broadcast (message) {
    const contentType = 'application/json'
    const payload = JSON.stringify(message)
    const data = { contentType, payload }
    const encoded = EphemeralMessage.encode(data)
    return this.archive.extension(EPHEMERAL_TYPE, encoded)
  }

  destroy () {
    const archive = this.archive

    archive.removeListener('peer-add', this._on_peer_add)
    archive.removeListener('peer-remove', this._on_peer_remove)
  }
}

class DatPeer {
  constructor (peer) {
    const id = peer.remoteId.toString('hex')
    const sessionData = peer.sessionData

    this.id = id
    this.sessionData = sessionData
    this.send = async (message) => {
      const contentType = 'application/json'
      const payload = JSON.stringify(message)
      const encoded = EphemeralMessage.encode({ payload, contentType })
      peer.extension(EPHEMERAL_TYPE, encoded)
    }
  }
}

DatPeers.EXTENSIONS = EXTENSIONS

module.exports = DatPeers
