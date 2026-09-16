/* eslint-disable react-refresh/only-export-components -- hooks share this provider context. */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

const WatercolorSubjectsContext = createContext(null);

export function WatercolorSubjectsProvider({ children }) {
  const nextId = useRef(0);
  const [subjects, setSubjects] = useState([]);
  const register = useCallback((ref, preferredId) => {
    const id = preferredId ?? `subject-${nextId.current++}`;
    setSubjects((current) => [...current.filter((subject) => subject.id !== id), { id, ref }]);
    return () => setSubjects((current) => current.filter((subject) => subject.id !== id));
  }, []);
  const value = useMemo(() => ({ register, subjects }), [register, subjects]);
  return <WatercolorSubjectsContext.Provider value={value}>{children}</WatercolorSubjectsContext.Provider>;
}

/** Register a mesh/group whose visible depth receives its own 0–1 range. */
export function useWatercolorSubject(ref, id) {
  const context = useContext(WatercolorSubjectsContext);
  if (!context) throw new Error('useWatercolorSubject must be used inside MultiPassPipeline.');
  const { register } = context;
  useEffect(() => register(ref, id), [id, ref, register]);
}

export function useWatercolorSubjects() {
  const context = useContext(WatercolorSubjectsContext);
  if (!context) throw new Error('useWatercolorSubjects must be used inside MultiPassPipeline.');
  return context.subjects;
}
