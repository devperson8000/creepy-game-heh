export function createSeamlessLoopBuffer(context, sourceBuffer, fadeSeconds = 0.38) {
  if (!context?.createBuffer || !sourceBuffer?.getChannelData) {
    throw new TypeError('A Web Audio context and decoded audio buffer are required.');
  }

  const fadeFrames = Math.max(
    32,
    Math.min(
      Math.floor(sourceBuffer.sampleRate * fadeSeconds),
      Math.floor(sourceBuffer.length / 4)
    )
  );
  const middleFrames = sourceBuffer.length - fadeFrames * 2;
  if (middleFrames < 32) return sourceBuffer;

  const result = context.createBuffer(
    sourceBuffer.numberOfChannels,
    sourceBuffer.length - fadeFrames,
    sourceBuffer.sampleRate
  );

  for (let channel = 0; channel < sourceBuffer.numberOfChannels; channel++) {
    const input = sourceBuffer.getChannelData(channel);
    const output = result.getChannelData(channel);

    // Start in the middle of the source, then blend its tail into its head.
    // The crossfade is part of the buffer, so looping has no hard restart.
    output.set(input.subarray(fadeFrames, sourceBuffer.length - fadeFrames), 0);

    for (let frame = 0; frame < fadeFrames; frame++) {
      const progress = frame / (fadeFrames - 1);
      const tail = input[sourceBuffer.length - fadeFrames + frame];
      const head = input[frame];
      output[middleFrames + frame] =
        tail * Math.cos(progress * Math.PI / 2) +
        head * Math.sin(progress * Math.PI / 2);
    }
  }

  return result;
}
