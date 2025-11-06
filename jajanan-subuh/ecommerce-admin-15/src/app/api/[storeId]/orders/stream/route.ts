import db from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  const { storeId } = await params;
  if (!storeId) return new Response("storeId dibutuhkan", { status: 400 });

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // initialize baseline to now so we don't emit historical orders on new connections
      let lastSeen: string | null = new Date().toISOString();
      let stopped = false;

      const pollInterval = 2000; // server-side poll every 2s

      const run = async () => {
        if (stopped) return;
        try {
          // build where clause
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const where: any = { storeId };
          if (lastSeen) {
            where.createdAt = { gt: new Date(lastSeen) };
          }

          const orders = await db.order.findMany({
            where,
            orderBy: { createdAt: "asc" },
            take: 20,
          });

          for (const o of orders) {
            const createdAtIso =
              o.createdAt instanceof Date
                ? o.createdAt.toISOString()
                : new Date(o.createdAt).toISOString();
            const payload = JSON.stringify({ ...o, createdAt: createdAtIso });
            controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
            lastSeen = createdAtIso;
          }
        } catch {
          // ignore polling errors
        }

        // schedule next poll
        if (!stopped) setTimeout(run, pollInterval);
      };

      // initial ping so client can open connection
      controller.enqueue(encoder.encode(`:ok\n\n`));
      run();

      // cleanup when client closes
      // provide cancel handler
      // @ts-expect-error - controller.cancel is not part of ReadableStreamDefaultController typing
      controller.cancel = () => {
        stopped = true;
      };
    },
    cancel() {
      // no-op, handled in start via controller.cancel
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
