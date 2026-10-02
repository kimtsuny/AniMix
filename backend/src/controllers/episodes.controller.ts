import type { Request, Response } from "express";
import {
  getStream,
  getAnonymousStream,
} from "../services/streaming/streaming.service.js";

export async function getEpisodeStream(
  req: Request,
  res: Response
) {
  try {
    const episodeId = Number(req.params.episodeId);

    if (!Number.isInteger(episodeId) || episodeId <= 0) {
      return res.status(400).json({
        error: "Invalid episode ID",
      });
    }

    const stream = await getStream(episodeId);

    return res.json(stream);
  } catch (error) {
    console.error(
      "[Episodes Controller] Failed to resolve stream:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Failed to resolve episode stream";

    if (message.includes("not found")) {
      return res.status(404).json({
        error: message,
      });
    }

    return res.status(502).json({
      error: message,
    });
  }
}

export async function getAnonymousEpisodeStream(
  req: Request,
  res: Response
) {
  try {
    const provider = typeof req.query.provider === "string" ? req.query.provider : "";
    const providerId = typeof req.query.providerId === "string" ? req.query.providerId : "";

    if (!provider || !providerId) {
      return res.status(400).json({
        error: "Missing required query parameters: provider and providerId",
      });
    }

    const stream = await getAnonymousStream(provider, providerId);

    return res.json(stream);
  } catch (error) {
    console.error(
      "[Episodes Controller] Failed to resolve anonymous stream:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Failed to resolve anonymous episode stream";

    if (message.includes("not found")) {
      return res.status(404).json({
        error: message,
      });
    }

    return res.status(502).json({
      error: message,
    });
  }
}