import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AllUsersComponent } from './all-users.component';
import { SnackbarModule } from '../../../../modules/snackbar.module';
import { UserService } from '../../../../services/entities/user.service';

describe('AllUsersComponent', () => {
    let component: AllUsersComponent;
    let fixture: ComponentFixture<AllUsersComponent>;
    const snackBar = { openSnackBar: jasmine.createSpy('openSnackBar') };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [AllUsersComponent],
            providers: [
                {
                    provide: UserService,
                    useValue: {
                        getAllUsers: () => of([
                            { userId: 1, name: 'Lectora', email: 'lectora@example.com', role: { Id: 1, Nombre: 'usuario' }, books: [] },
                            { userId: 2, name: 'Admin', email: 'admin@example.com', role: { Id: 3, Nombre: 'administrador' }, books: [] }
                        ])
                    }
                },
                { provide: SnackbarModule, useValue: snackBar }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(AllUsersComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('oculta el baneo para administradores', () => {
        const banButtons = fixture.nativeElement.querySelectorAll('.user-actions__ban');

        expect(banButtons.length).toBe(1);
        expect(fixture.nativeElement.textContent).toContain('Admin');
    });

    it('alterna el baneo solo en la vista local', () => {
        const user = component.users[0];

        component.toggleBan(user);

        expect(user.isBanned).toBeTrue();
        expect(user.accountState).toBe('Baneada');
        expect(snackBar.openSnackBar).toHaveBeenCalled();
    });
});
