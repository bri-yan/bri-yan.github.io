import { createRef, useMemo } from 'react';
import * as THREE from 'three';
import { DEFAULT_BACKGROUND_COLOR, PIPELINE_FBO_KEYS } from '../config';
import { RawColorPass } from './passes/RawColorPass';
import { RawDepthPass } from './passes/RawDepthPass';
import { NormalizedDepthPass } from './passes/NormalizedDepthPass';
import { OutputPass } from './passes/OutputPass';
import { DebugViewPass } from './passes/DebugViewPass';
import { WatercolorSubjectsProvider } from './WatercolorSubjects';

const toColor = (value) => (value?.isColor ? value : new THREE.Color(value));

/**
 * Minimal render-pipeline foundation. The live scene is captured unchanged by
 * raw-color and raw-depth sibling captures, then the normal color output.
 */
export function MultiPassPipeline({
  children,
  backgroundColor = DEFAULT_BACKGROUND_COLOR,
  debugView = 'output',
  debugChannel = 'rgb',
}) {
  const background = useMemo(() => toColor(backgroundColor), [backgroundColor]);
  const fbos = useMemo(
    () => Object.fromEntries(PIPELINE_FBO_KEYS.map((key) => [key, createRef()])),
    []
  );

  return (
    <>
      <WatercolorSubjectsProvider>
        {children}
        <RawColorPass outputRef={fbos.color} />
        <RawDepthPass outputRef={fbos.rawDepth} />
        <NormalizedDepthPass rawDepthRef={fbos.rawDepth} outputRef={fbos.normalizedDepth} />
        <OutputPass colorRef={fbos.color} backgroundColor={background} />
        <DebugViewPass
          passes={{
            color: fbos.color,
            'raw-depth': fbos.rawDepth,
            'normalized-depth': fbos.normalizedDepth,
          }}
          view={debugView}
          channel={debugChannel}
        />
      </WatercolorSubjectsProvider>
    </>
  );
}
