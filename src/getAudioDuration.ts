import { Input, ALL_FORMATS, UrlSource } from "mediabunny";

export const getAudioDuration = async (src: string): Promise<number> => {
  try {
    const input = new Input({
      formats: ALL_FORMATS,
      source: new UrlSource(src, {
        getRetryDelay: () => null,
      }),
    });

    const durationInSeconds = await input.computeDuration();
    return durationInSeconds;
  } catch (err) {
    console.error(`Failed to compute duration for ${src}:`, err);
    return 5; // fallback to 5 seconds
  }
};
