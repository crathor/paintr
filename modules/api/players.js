import { Mongo } from 'meteor/mongo'
import { Meteor } from 'meteor/meteor'
import { GameBoard } from './gameboard'
import Konva from 'konva'
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  BRICK_COLUMNS,
  BRICK_HEIGHT,
  BRICK_WIDTH,
  BRICK_ROWS,
  rowColToArrayIndex
} from '../ui/components/config'

export const Players = new Mongo.Collection('players')

if (Meteor.isServer) {
  AccountsGuest.enabled = true
  AccountsGuest.anonymous = true
}

const getPlayer = player => {
  return Players.findOne({ player })
}

const checkCollision = player => {
  if (player) {
    const playerBrickCol = Math.floor(player.x / BRICK_WIDTH)
    const playerBrickRow = Math.floor(player.y / BRICK_HEIGHT)
    const brickIndex = rowColToArrayIndex(playerBrickCol, playerBrickRow)

    const brick = GameBoard.find({ index: brickIndex }).fetch()
    if (brick[0].powerup) {
      if (!player.boost) {
        const power = Math.floor(Math.random() * 10)
        switch (power) {
          case 8:
            Meteor.call('set.gameboard.color', player)
            break
          case 9:
            Meteor.call('reset.gameboard')
            break

          default:
            Meteor.call('freeze.players', player)
            Meteor.call('unfreeze.players')
            // Meteor.call('boost.player', player)
            // Meteor.call('remove.boost', player)
            break
        }
        GameBoard.update(
          { index: brickIndex },
          { $set: { powerup: false } },
          { upsert: true }
        )
      }
    }
    if (brickIndex >= 0 && brickIndex < BRICK_COLUMNS * BRICK_ROWS) {
      GameBoard.update(
        { index: brickIndex },
        { $set: { color: player.color } },
        { upsert: true }
      )
    }
  }
}
Meteor.methods({
  'reset.player.speed'(player) {
    Players.update(
      player._id,
      { $set: { speed: 10, 'powerup.speed': false } },
      { upsert: true }
    )
  },
  'reset.players'() {
    Players.remove({})
  },
  'get.player'(id) {
    return getPlayer(id)
  },
  'freeze.players'(player) {
    Players.update(
      { color: { $ne: player.color } },
      { $set: { speed: 0, frozen: true } },
      {
        upsert: true,
        multi: true
      }
    )
  },
  'unfreeze.players'() {
    Meteor.setTimeout(() => {
      Players.update(
        {},
        { $set: { speed: 10, frozen: false } },
        { upsert: true, multi: true }
      )
    }, 5000)
  },
  'remove.player'(player) {
    Players.remove({ player })
  },
  'add.player'(name) {
    Players.insert({
      name,
      color: Konva.Util.getRandomColor(),
      count: 0,
      size: 10,
      speed: 10,
      y: Math.floor(1 + Math.random() * GAME_HEIGHT),
      x: Math.floor(1 + Math.random() * GAME_WIDTH),
      boost: false,
      frozen: false,
      player: Meteor.userId()
    })
  },
  'boost.player'(player) {
    Players.update(
      player._id,
      { $set: { speed: 20, boost: true } },
      { upsert: true }
    )
  },
  'remove.boost'(player) {
    Meteor.setTimeout(() => {
      Players.update(
        player._id,
        { $set: { speed: 10, boost: false } },
        { upsert: true }
      )
    }, 5000)
  },
  'reverse.player.direction'(player) {
    if (player.powerup.reverse) return
    Players.update(
      player._id,
      { $set: { 'powerup.reverse': true, speed: (player.speed *= -1) } },
      { upsert: true }
    )
  },
  'reset.player.reverse'(player) {
    if (!player.powerup.reverse) return
    Players.update(
      player._id,
      { $set: { 'powerup.reverse': false, speed: (player.speed *= -1) } },
      { upsert: true }
    )
  },
  'move.up'(player) {
    const p = getPlayer(player)
    if (p.y <= 0 + BRICK_HEIGHT) return
    else {
      Players.update({ player }, { $set: { y: p.y - p.speed } })
      checkCollision(p)
    }
  },
  'move.down'(player) {
    const p = getPlayer(player)
    if (p.y >= GAME_HEIGHT - BRICK_HEIGHT) return
    else {
      Players.update({ player }, { $set: { y: p.y + p.speed } })
      checkCollision(p)
    }
  },
  'move.left'(player) {
    const p = getPlayer(player)
    if (p.x <= 0 + BRICK_WIDTH) return
    else {
      Players.update({ player }, { $set: { x: p.x - p.speed } })
      checkCollision(p)
    }
  },
  'move.right'(player) {
    const p = getPlayer(player)
    if (p.x >= GAME_WIDTH - BRICK_WIDTH) return
    else {
      Players.update({ player }, { $set: { x: p.x + p.speed } })
      checkCollision(p)
    }
  }
})
