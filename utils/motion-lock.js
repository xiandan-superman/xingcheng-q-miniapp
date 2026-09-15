/**
 * App-wide heavy motion lock: at most one today-curious / idle-blink (or similar) heavy loop.
 * Short loops (loading/submitting) and one-shots do not need this lock.
 */
let heavyOwnerId = null

function acquireHeavy(ownerId) {
  if (!ownerId) return false
  if (heavyOwnerId && heavyOwnerId !== ownerId) return false
  heavyOwnerId = ownerId
  return true
}

function releaseHeavy(ownerId) {
  if (heavyOwnerId === ownerId) heavyOwnerId = null
}

function hasHeavy() {
  return Boolean(heavyOwnerId)
}

function currentOwner() {
  return heavyOwnerId
}

module.exports = { acquireHeavy, releaseHeavy, hasHeavy, currentOwner }
