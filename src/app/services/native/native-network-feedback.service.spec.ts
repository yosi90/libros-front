import { TestBed } from '@angular/core/testing';
import { DRAGON_NETWORK_MESSAGES, Ipv6FallbackEvent, NATIVE_NETWORK_EVENTS, NativeNetworkFeedbackService } from './native-network-feedback.service';

describe('NativeNetworkFeedbackService', () => {
    let emit: (event: Ipv6FallbackEvent) => void;
    let addListener: jasmine.Spy;
    let service: NativeNetworkFeedbackService;

    beforeEach(() => {
        addListener = jasmine.createSpy('addListener').and.callFake((_name, callback) => {
            emit = callback;
            return Promise.resolve({ remove: async () => undefined });
        });
        TestBed.configureTestingModule({ providers: [{ provide: NATIVE_NETWORK_EVENTS, useValue: { addListener } }] });
        service = TestBed.inject(NativeNetworkFeedbackService);
        service.initialize();
    });

    it('no inventa fallback por tiempo y registra un único listener', () => {
        service.initialize();
        expect(service.message()).toBeNull();
        expect(addListener).toHaveBeenCalledTimes(1);
    });

    it('elige una frase al empezar IPv6 y la conserva durante peticiones concurrentes', () => {
        spyOn(Math, 'random').and.returnValue(0.4);
        emit({ requestId: 'a', active: true });
        const message = service.message();
        expect(message).toBe(DRAGON_NETWORK_MESSAGES[2]);
        emit({ requestId: 'b', active: true });
        emit({ requestId: 'a', active: false });
        expect(service.message()).toBe(message);
        expect(Math.random).toHaveBeenCalledTimes(1);
        emit({ requestId: 'b', active: false });
        expect(service.message()).toBeNull();
    });

    it('tolera eventos repetidos y elige otra frase en la siguiente espera', () => {
        spyOn(Math, 'random').and.returnValues(0, 0.99);
        emit({ requestId: 'a', active: true });
        emit({ requestId: 'a', active: true });
        emit({ requestId: 'a', active: false });
        expect(service.message()).toBeNull();
        emit({ requestId: 'b', active: true });
        expect(service.message()).toBe(DRAGON_NETWORK_MESSAGES[4]);
    });

    it('no registra listeners nativos en web', () => {
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({ providers: [{ provide: NATIVE_NETWORK_EVENTS, useValue: null }] });
        const web = TestBed.inject(NativeNetworkFeedbackService);
        expect(() => web.initialize()).not.toThrow();
        expect(web.message()).toBeNull();
    });
});
