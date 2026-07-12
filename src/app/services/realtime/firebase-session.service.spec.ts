import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { FirebaseSessionService } from './firebase-session.service';
import { RuntimeConfigService } from './runtime-config.service';

describe('FirebaseSessionService', () => {
    it('does not initialize Firebase when runtime configuration disables it', () => {
        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(),
                FirebaseSessionService,
                { provide: RuntimeConfigService, useValue: { firebase: { enabled: false } } }
            ]
        });

        const service = TestBed.inject(FirebaseSessionService);
        service.startForUser(7).subscribe(value => expect(value).toBeUndefined());
        expect(service.auth).toBeNull();
    });
});
