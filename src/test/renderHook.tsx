import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'

/**
 * A ~30-line hook harness, so hook behaviour can be tested without pulling in
 * React Testing Library for one file. React 19 exports `act` itself and
 * `react-dom/client` mounts into jsdom, which is all this needs.
 */

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined
}

export interface HookHarness<T> {
  /** The latest value the hook returned. */
  current: () => T
  /** Runs a callback inside act(), flushing effects and state updates. */
  act: (fn: () => void | Promise<void>) => Promise<void>
  unmount: () => void
}

export async function renderHook<T>(useHook: () => T): Promise<HookHarness<T>> {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true

  let latest: T
  function Probe() {
    // Deliberate: capturing the hook's return value out of the render is the
    // whole job of a harness. The lint rule is right about product code.
    // eslint-disable-next-line react/globals
    latest = useHook()
    return null
  }

  const container = document.createElement('div')
  document.body.appendChild(container)
  let root: Root

  await act(async () => {
    root = createRoot(container)
    root.render(<Probe />)
  })

  return {
    current: () => latest,
    act: async (fn) => {
      await act(async () => {
        await fn()
      })
    },
    unmount: () => {
      act(() => root.unmount())
      container.remove()
    },
  }
}

/** Lets pending promise chains settle inside an act() block. */
export const flush = (): Promise<void> =>
  new Promise<void>((resolve) => setTimeout(resolve, 0))
