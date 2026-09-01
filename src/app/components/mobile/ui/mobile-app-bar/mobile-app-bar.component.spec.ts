import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MobileAppBarComponent } from './mobile-app-bar.component';

describe('MobileAppBarComponent', () => {
    let fixture: ComponentFixture<MobileAppBarComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({ imports: [MobileAppBarComponent] }).compileComponents();
        fixture = TestBed.createComponent(MobileAppBarComponent);
        fixture.componentRef.setInput('title', 'Mi biblioteca');
    });

    it('switches to the two-column layout when the leading action is omitted', () => {
        fixture.componentRef.setInput('leadingIcon', null);
        fixture.detectChanges();

        const appBar = fixture.nativeElement.querySelector('.m-appbar') as HTMLElement;
        expect(appBar.classList).toContain('m-appbar--without-leading');
        expect(fixture.nativeElement.querySelector(':scope .m-appbar > .m-appbar__action')).toBeNull();
    });

    it('keeps the standard layout when a leading action exists', () => {
        fixture.detectChanges();

        const appBar = fixture.nativeElement.querySelector('.m-appbar') as HTMLElement;
        expect(appBar.classList).not.toContain('m-appbar--without-leading');
        expect(fixture.nativeElement.querySelector('.m-appbar > .m-appbar__action')).not.toBeNull();
    });
});
