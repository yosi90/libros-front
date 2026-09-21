import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { BookSaveIndicatorService } from './book-save-indicator.service';

describe('BookSaveIndicatorService', () => {
    let service: BookSaveIndicatorService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(BookSaveIndicatorService);
    });

    it('shows the saved book for three seconds', fakeAsync(() => {
        service.notifySaved(12);

        expect(service.isVisibleFor(12)).toBeTrue();
        tick(2999);
        expect(service.isVisibleFor(12)).toBeTrue();
        tick(1);
        expect(service.isVisibleFor(12)).toBeFalse();
    }));

    it('restarts the timeout when another save completes', fakeAsync(() => {
        service.notifySaved(12);
        tick(2000);
        service.notifySaved(12);
        tick(2000);

        expect(service.isVisibleFor(12)).toBeTrue();
        tick(1000);
        expect(service.isVisibleFor(12)).toBeFalse();
    }));
});
