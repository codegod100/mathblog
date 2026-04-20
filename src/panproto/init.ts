import { Panproto } from '@panproto/core'

let instance: Panproto | null = null
let initPromise: Promise<Panproto> | null = null

export async function getPanproto(): Promise<Panproto> {
  if (instance) return instance
  if (initPromise) return initPromise

  initPromise = Panproto.init().then((p) => {
    instance = p
    return p
  }).catch((err) => {
    initPromise = null
    throw err
  })

  return initPromise
}
