/* eslint-disable react-refresh/only-export-components -- the hook shares this provider context. */
import { createContext, useContext, useMemo } from 'react';

const TransitionContext = createContext(null);

/**
 * How far the painting is unpainted, `progress`: 0 fully painted, 1 bare
 * paper. It changes every frame of a view transition, so it lives in a mutable
 * object that the passes read when they repaint, not in props.
 */
export function TransitionProvider({ children }) {
  const transition = useMemo(() => ({ progress: 0 }), []);
  return <TransitionContext.Provider value={transition}>{children}</TransitionContext.Provider>;
}

export function useTransition() {
  const transition = useContext(TransitionContext);
  if (!transition) throw new Error('useTransition must be used inside MultiPassPipeline.');
  return transition;
}
