export type Handler<T> = (payload: T) => void;
export declare class EventBus<M extends Record<string, unknown>> {
    private m;
    on<K extends keyof M>(k: K, h: Handler<M[K]>): () => boolean;
    emit<K extends keyof M>(k: K, p: M[K]): void;
}
export type SnapbackEvents = {
    "checkpoint:created": {
        id: string;
        risk?: number;
        trigger: string;
    };
    "checkpoint:restored": {
        id: string;
        success: boolean;
    };
    "risk:detected": {
        score: number;
        factors: string[];
        file?: string;
    };
    "failover:triggered": {
        from: "enhanced";
        to: "legacy";
        error: string;
    };
};
