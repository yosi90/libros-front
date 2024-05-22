import { BookStatus } from "./book-status";

export interface ReadStatus {
    readStatusId: number,
    status: BookStatus,
    date: string
}