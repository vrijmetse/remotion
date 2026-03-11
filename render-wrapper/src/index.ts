import {
  renderMediaOnLambda,
  getRenderProgress,
} from "@remotion/lambda/client";
import type { AwsRegion } from "@remotion/lambda";

/**
 * Payload shape for starting a render.
 */
interface RenderPayload {
  action?: "render";
  composition: string;
  inputProps: Record<string, unknown>;
  logoUrl?: string;
  /** Optional overrides — sensible defaults provided */
  serveUrl?: string;
  region?: AwsRegion;
  functionName?: string;
  codec?:
    | "h264"
    | "h265"
    | "vp8"
    | "vp9"
    | "mp3"
    | "aac"
    | "wav"
    | "gif"
    | "prores";
  privacy?: "public" | "private" | "no-acl";
  framesPerLambda?: number;
  logLevel?: "verbose" | "info" | "warn" | "error";
  outName?: string;
}

/**
 * Payload shape for checking render status.
 */
interface StatusPayload {
  action: "status";
  renderId: string;
  bucketName: string;
  region?: AwsRegion;
  functionName?: string;
}

type IncomingPayload = RenderPayload | StatusPayload;

/**
 * Environment variables (set on the wrapper Lambda, NOT in code):
 *   REMOTION_SERVE_URL       – from deploySite() output
 *   REMOTION_FUNCTION_NAME   – the Remotion render Lambda name
 *   REMOTION_REGION          – e.g. "ap-southeast-1"
 */

const requireEnv = (key: string): string => {
  const val = process.env[key];
  if (!val) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return val;
};

const handleRender = async (payload: RenderPayload) => {
  const {
    composition,
    inputProps,
    action: _,
    ...overrides
  } = payload as RenderPayload & { type?: string };

  if (!composition) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing required field: composition" }),
    };
  }

  if (!inputProps) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing required field: inputProps" }),
    };
  }

  const region = (overrides.region ??
    process.env.REMOTION_REGION ??
    "ap-southeast-1") as AwsRegion;
  const serveUrl = overrides.serveUrl ?? requireEnv("REMOTION_SERVE_URL");
  const functionName =
    overrides.functionName ?? requireEnv("REMOTION_FUNCTION_NAME");

  const result = await renderMediaOnLambda({
    region,
    serveUrl,
    functionName,
    composition,
    codec: overrides.codec ?? "h264",
    inputProps: {
      ...inputProps,
      ...(payload.logoUrl ? { logoUrl: payload.logoUrl } : {}),
    },
    privacy: overrides.privacy ?? "public",
    framesPerLambda: overrides.framesPerLambda ?? undefined,
    logLevel: overrides.logLevel ?? "info",
    outName: overrides.outName ?? undefined,
    envVariables: {},
  });

  return {
    statusCode: 200,
    body: JSON.stringify({
      success: true,
      renderId: result.renderId,
      bucketName: result.bucketName,
      region,
      functionName,
    }),
  };
};

const handleStatus = async (payload: StatusPayload) => {
  const { renderId, bucketName } = payload;

  if (!renderId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing required field: renderId" }),
    };
  }

  if (!bucketName) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing required field: bucketName" }),
    };
  }

  const region = (payload.region ??
    process.env.REMOTION_REGION ??
    "us-east-1") as AwsRegion;
  const functionName =
    payload.functionName ?? requireEnv("REMOTION_FUNCTION_NAME");

  const progress = await getRenderProgress({
    renderId,
    bucketName,
    region,
    functionName,
  });

  return {
    statusCode: 200,
    body: JSON.stringify({
      success: true,
      done: progress.done,
      overallProgress: progress.overallProgress,
      outputFile: progress.outputFile,
      outputSizeInBytes: progress.outputSizeInBytes,
      costs: progress.costs,
      fatalErrorEncountered: progress.fatalErrorEncountered,
      errors: progress.errors.length > 0 ? progress.errors : undefined,
      timeToFinish: progress.timeToFinish,
      framesRendered: progress.framesRendered,
    }),
  };
};

export const handler = async (event: unknown) => {
  // n8n's AWS Lambda node can send the payload as a string or object
  const payload: IncomingPayload =
    typeof event === "string" ? JSON.parse(event) : (event as IncomingPayload);

  try {
    if ("action" in payload && payload.action === "status") {
      return await handleStatus(payload as StatusPayload);
    }

    // Default: render (backward compatible — no action field = render)
    return await handleRender(payload as RenderPayload);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("Wrapper Lambda error:", message, stack);

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: message,
      }),
    };
  }
};
