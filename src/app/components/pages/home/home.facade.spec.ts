import { HomeFacade } from './home.facade';

describe('HomeFacade', () => {
    it('mantiene la misma cita durante toda la vida de la ruta', () => {
        spyOn(Math, 'random').and.returnValue(0.25);
        const facade = new HomeFacade();
        const initialQuote = facade.readingQuote();

        expect(facade.readingQuote()).toBe(initialQuote);
        expect(initialQuote.texto).toBeTruthy();
        expect(initialQuote.autor).toBeTruthy();
    });
});
