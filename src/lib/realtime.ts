// src/lib/realtime.ts
import { supa } from "./supabaseClient";

export function joinMatchChannel(matchId: string) {
    const channel = supa.channel(`match:${matchId}`, {
        config: { broadcast: { ack: true }, presence: { key: "player" } }
    });

    const on = {
        subscribe: async () => channel.subscribe(),
        presenceTrack: async (payload: Record<string, unknown>) => channel.track(payload),
        leave: async () => channel.unsubscribe(),
        onEvent: (event: string, cb: (p: any) => void) =>
            channel.on("broadcast", { event }, (p) => cb(p.payload)),
        emit: async (event: string, payload: unknown) =>
            channel.send({ type: "broadcast", event, payload })
    };

    return on;
}
