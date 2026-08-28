import { TestBed } from '@angular/core/testing';
import { NativeFirebaseAuthAdapter } from '../native/native-firebase-auth.adapter';
import { RuntimeConfigService } from '../realtime/runtime-config.service';
import { NATIVE_MOBILE_PLATFORM } from '../ui/presentation-mode.service';
import { FirebaseProviderAuthService } from './firebase-provider-auth.service';

describe('FirebaseProviderAuthService en Android', () => {
    let nativeAuth: jasmine.SpyObj<NativeFirebaseAuthAdapter>;
    let service: FirebaseProviderAuthService;

    beforeEach(() => {
        nativeAuth = jasmine.createSpyObj<NativeFirebaseAuthAdapter>('NativeFirebaseAuthAdapter', [
            'signInPassword', 'signInGoogle', 'startPhone', 'confirmPhone', 'freshIdToken', 'signOut'
        ]);
        TestBed.configureTestingModule({
            providers: [
                FirebaseProviderAuthService,
                { provide: NativeFirebaseAuthAdapter, useValue: nativeAuth },
                { provide: NATIVE_MOBILE_PLATFORM, useValue: true },
                {
                    provide: RuntimeConfigService,
                    useValue: {
                        firebase: {
                            enabled: true,
                            providers: { password: true, google: true, phone: true }
                        }
                    }
                }
            ]
        });
        service = TestBed.inject(FirebaseProviderAuthService);
    });

    it('delega contraseña y Google al SDK nativo sin iniciar redirect web', async () => {
        nativeAuth.signInPassword.and.resolveTo('password-token');
        nativeAuth.signInGoogle.and.resolveTo('google-token');

        await expectAsync(service.signInPassword('reader@example.test', 'Password1!')).toBeResolvedTo('password-token');
        await expectAsync(service.signInGoogle('redirect')).toBeResolvedTo('google-token');
        await expectAsync(service.consumeGoogleRedirect()).toBeResolvedTo(null);

        expect(nativeAuth.signInPassword).toHaveBeenCalledOnceWith('reader@example.test', 'Password1!');
        expect(nativeAuth.signInGoogle).toHaveBeenCalledTimes(1);
    });

    it('conserva el verificationId telefónico solo hasta confirmar el código', async () => {
        nativeAuth.startPhone.and.resolveTo({ state: 'code_sent', verificationId: 'verification-id' });
        nativeAuth.confirmPhone.and.resolveTo('phone-token');

        await service.startPhone('+34600000000', 'unused-recaptcha');
        await expectAsync(service.confirmPhone('123456')).toBeResolvedTo('phone-token');

        expect(nativeAuth.confirmPhone).toHaveBeenCalledOnceWith('verification-id', '123456');
        await expectAsync(service.confirmPhone('123456')).toBeRejectedWithError(/Solicita primero/);
    });

    it('limpia el estado y cierra Firebase nativo', async () => {
        nativeAuth.signOut.and.resolveTo();

        await service.clear();

        expect(nativeAuth.signOut).toHaveBeenCalledTimes(1);
    });
});
