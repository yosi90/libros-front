export type NativeReaderMode = 'closed' | 'expanded' | 'minimized';
export type NativeReaderTransition = 'idle' | 'opening' | 'minimizing' | 'restoring' | 'closing';

export interface NativeReaderBookSummary {
    bookName: string;
    coverUrl: string;
    anthologyId?: number | null;
}

export interface NativeReaderSessionState {
    mode: NativeReaderMode;
    transition: NativeReaderTransition;
    bookId: number | null;
    anthologyId: number | null;
    bookName: string;
    coverUrl: string;
    readerUrl: string | null;
    backgroundUrl: string;
    saving: boolean;
}

export interface PersistedNativeReaderSession {
    version: 1;
    actorId: number;
    bookId: number;
    anthologyId?: number | null;
    readerUrl: string;
    updatedAt: number;
}
