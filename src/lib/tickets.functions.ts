import { createServerFn } from "@tanstack/react-start";

import { classifyRequest } from "./classifier.server";
import { classificationRequestSchema } from "./classification";

/**
 * Server function the UI calls: validate the request text, run the
 * classification engine, and return a plain result object. No database work
 * here (that is Task 4) and no UI logic — this is the boundary between them.
 */
export const classifyTicket = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => classificationRequestSchema.parse(input))
  .handler(async ({ data }) => {
    const request = getRequest();
    return classifyRequest(data.text, request?.signal);
  });
