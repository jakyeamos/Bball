export type PausePredictPhase =
  | 'idle'
  | 'playing'
  | 'pausedForQuestion'
  | 'answering'
  | 'reveal'
  | 'resumed'
  | 'fallback';

export type PausePredictEvent =
  | 'start'
  | 'autoPause'
  | 'submit'
  | 'reveal'
  | 'resume'
  | 'fail';

const TRANSITIONS: Record<PausePredictPhase, Partial<Record<PausePredictEvent, PausePredictPhase>>> = {
  idle: { start: 'playing', fail: 'fallback' },
  playing: { autoPause: 'pausedForQuestion', fail: 'fallback' },
  pausedForQuestion: { submit: 'answering', fail: 'fallback' },
  answering: { reveal: 'reveal', fail: 'fallback' },
  reveal: { resume: 'resumed', fail: 'fallback' },
  resumed: {},
  fallback: {},
};

export function transitionPausePredictState(
  current: PausePredictPhase,
  event: PausePredictEvent
): PausePredictPhase {
  return TRANSITIONS[current][event] ?? current;
}
