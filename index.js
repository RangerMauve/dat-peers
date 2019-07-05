const EventTarget = require('@ungap/event-target')
const { DatEphemeralExtMsg } = require('@beaker/dat-ephemeral-ext-msg')
const { DatSessionDataExtMsg } = require('@beaker/dat-session-data-ext-msg')

const EXTENSIONS = ['ephemeral', 'session-data']

class DatPeers extends EventTarget {
  constructor (archive) {
    super()
    this.archive = archive
    this.datEphemeralExtMsg = new DatEphemeralExtMsg()
    this.datSessionDataExtMsg = new DatSessionDataExtMsg()

    this.datEphemeralExtMsg.watchDat(archive)
    this.datSessionDataExtMsg.watchDat(archive)

    this.datEphemeralExtMsg.on('message', (dat, datPeer, { contentType, payload }) => {
      const type = 'message'
      const peer = this._getPeer(datPeer)

      let message = payload.toString('utf8')
      try {
        message = JSON.parse(message)
      } catch (e) {
        // On well, it's not JSON I guess
      }

      const event = {
        type, peer, message
      }

      this.dispatchEvent(event)
    })

    this.datSessionDataExtMsg.on('session-data', (archiveOrHypercore, datPeer, sessionData) => {
      const type = 'session-data'
      const peer = this._getPeer(datPeer)

      const event = {
        type, peer
      }

      this.dispatchEvent(event)
    })

    this._on_peer_add = (datPeer) => {
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

    const hypercore = archive.metadata

    hypercore.on('peer-add', this._on_peer_add)
    hypercore.on('peer-remove', this._on_peer_remove)
  }

  _getPeer (peer) {
    const id = peer.remoteId.toString('hex')
    const rawSessionData = this.datSessionDataExtMsg.getSessionData(this.archive, peer)
    let sessionData = null
    try {
      sessionData = JSON.parse(rawSessionData.toString('utf8'))
    } catch (e) {
      // Oh well
    }
    return new DatPeer(id, sessionData, this)
  }

  async getSessionData () {
    return this.datSessionDataExtMsg.getLocalSessionData(this.archive)
  }

  async setSessionData (sessionData) {
    const data = Buffer.from(JSON.stringify(sessionData))
    return this.datSessionDataExtMsg.setLocalSessionData(this.archive, data)
  }

  async list () {
    const hypercore = this.archive.metadata
    const peers = hypercore.peers

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
    return this.datEphemeralExtMsg.broadcast(this.archive, { contentType, payload })
  }

  destroy () {
    const archive = this.archive
    this.datEphemeralExtMsg.unwatchDat(archive)
    this.datSessionDataExtMsg.unwatchDat(archive)

    const hypercore = archive.metadata

    hypercore.removeListener('peer-add', this._on_peer_add)
    hypercore.removeListener('peer-remove', this._on_peer_remove)
  }
}

class DatPeer {
  constructor (id, sessionData, datPeers) {
    this.id = id.toString('hex')
    this.sessionData = sessionData
    this.send = async (message) => {
      const contentType = 'application/json'
      const payload = JSON.stringify(message)
      return datPeers.datEphemeralExtMsg.send(datPeers.archive, this.id, {
        contentType, payload
      })
    }
  }
}

DatPeers.EXTENSIONS = EXTENSIONS

module.exports = DatPeers
