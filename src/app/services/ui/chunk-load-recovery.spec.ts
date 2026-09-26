import { ErrorHandler } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ChunkLoadRecoveryErrorHandler, isChunkLoadError } from './chunk-load-recovery';
import { PWA_RELOAD } from './pwa-lifecycle.service';

describe('ChunkLoadRecoveryErrorHandler', () => {
    let handler: ChunkLoadRecoveryErrorHandler;
    let reload: jasmine.Spy;

    beforeEach(() => {
        sessionStorage.removeItem('libros:chunk-reload-at');
        reload = jasmine.createSpy('reload');
        TestBed.configureTestingModule({
            providers: [ChunkLoadRecoveryErrorHandler, { provide: PWA_RELOAD, useValue: reload }]
        });
        handler = TestBed.inject(ChunkLoadRecoveryErrorHandler);
        spyOn(ErrorHandler.prototype, 'handleError');
    });

    afterEach(() => sessionStorage.removeItem('libros:chunk-reload-at'));

    it('recognises the stale chunk messages of Firefox, Chromium and Safari', () => {
        expect(isChunkLoadError(new TypeError('error loading dynamically imported module: https://x/chunk-A.js'))).toBeTrue();
        expect(isChunkLoadError(new TypeError('Failed to fetch dynamically imported module: https://x/chunk-A.js'))).toBeTrue();
        expect(isChunkLoadError(new TypeError('Importing a module script failed.'))).toBeTrue();
        expect(isChunkLoadError(new Error('Cannot read properties of undefined'))).toBeFalse();
    });

    it('reloads once to fetch the published version', () => {
        handler.handleError(new TypeError('error loading dynamically imported module: https://x/chunk-A.js'));

        expect(reload).toHaveBeenCalledTimes(1);
        expect(ErrorHandler.prototype.handleError).not.toHaveBeenCalled();
    });

    it('does not loop when the chunk still fails right after reloading', () => {
        sessionStorage.setItem('libros:chunk-reload-at', String(Date.now()));

        handler.handleError(new TypeError('error loading dynamically imported module: https://x/chunk-A.js'));

        expect(reload).not.toHaveBeenCalled();
        expect(ErrorHandler.prototype.handleError).toHaveBeenCalled();
    });

    it('leaves other errors to the default handler', () => {
        handler.handleError(new Error('Otro fallo'));

        expect(reload).not.toHaveBeenCalled();
        expect(ErrorHandler.prototype.handleError).toHaveBeenCalled();
    });
});
