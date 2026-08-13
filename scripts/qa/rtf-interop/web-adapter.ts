import { htmlToRtf, rtfToHtml } from '../../../src/app/shared/rtf/rtf-text';

declare global {
    interface Window {
        __rtfInterop?: {
            roundTrip: (rtf: string) => string;
            serialize: (html: string) => string;
        };
    }
}

window.__rtfInterop = {
    roundTrip: (rtf: string): string => htmlToRtf(rtfToHtml(rtf)),
    serialize: (html: string): string => htmlToRtf(html)
};

export {};
