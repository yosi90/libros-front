import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { SnackbarModule } from '../../../../modules/snackbar.module';
import { ModerationService } from '../../../../services/entities/moderation.service';
import { CommunityPoliciesAdminComponent } from './community-policies-admin.component';

describe('CommunityPoliciesAdminComponent', () => {
    let component: CommunityPoliciesAdminComponent;
    let fixture: ComponentFixture<CommunityPoliciesAdminComponent>;
    let moderationSrv: jasmine.SpyObj<ModerationService>;

    const draft = { Tipo: 'uso' as const, Titulo: 'Normas V1', Markdown: 'Contenido', VersionActivaId: 8 };
    const active = {
        Tipo: 'uso' as const,
        Version: 1,
        Titulo: 'Normas V1',
        Markdown: 'Contenido',
        FechaPublicacion: '2026-07-14T10:00:00.000Z',
        Aceptada: true
    };

    beforeEach(async () => {
        moderationSrv = jasmine.createSpyObj<ModerationService>('ModerationService', [
            'getPolicyDraft', 'getActivePolicy', 'savePolicyDraft', 'publishPolicy'
        ]);
        moderationSrv.getPolicyDraft.and.returnValue(of(draft));
        moderationSrv.getActivePolicy.and.returnValue(of(active));
        moderationSrv.savePolicyDraft.and.callFake((_kind, payload) => of({ ...draft, ...payload }));
        moderationSrv.publishPolicy.and.returnValue(of({ Tipo: 'uso', Version: 2, VersionId: 9 }));

        await TestBed.configureTestingModule({
            imports: [CommunityPoliciesAdminComponent],
            providers: [
                { provide: ModerationService, useValue: moderationSrv },
                { provide: SnackbarModule, useValue: { openSnackBar: jasmine.createSpy('openSnackBar') } }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(CommunityPoliciesAdminComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('identifies whether the loaded form is published, a draft or empty', () => {
        expect(component.displayStatus).toBe('published');

        component.policyDraft!.Markdown = 'Cambio sin publicar';
        expect(component.displayStatus).toBe('draft');

        component.policyDraft!.Titulo = null;
        component.policyDraft!.Markdown = null;
        expect(component.displayStatus).toBe('empty');
    });

    it('preserves edits discarded by a reload and can return to the current form', () => {
        component.policyDraft!.Markdown = 'Edición que se descartará';

        component.loadPolicyDraft();

        expect(component.hasOlderRevisions).toBeTrue();
        component.viewPreviousRevision();
        expect(component.displayStatus).toBe('discarded');
        expect(component.displayedMarkdown).toBe('Edición que se descartará');

        component.viewCurrentRevision();
        expect(component.displayStatus).toBe('published');
        expect(component.displayedMarkdown).toBe('Contenido');
    });

    it('publishes the current fields directly', () => {
        spyOn(window, 'confirm').and.returnValue(true);
        component.policyDraft!.Titulo = 'Normas V2';
        component.policyDraft!.Markdown = 'Contenido nuevo';

        component.publishPolicy();

        expect(moderationSrv.publishPolicy).toHaveBeenCalledWith('uso', {
            Titulo: 'Normas V2',
            Markdown: 'Contenido nuevo'
        });
    });

    it('keeps a replaced server draft in the session history', () => {
        component.activePolicy = { ...active, Markdown: 'Versión publicada anterior' };
        component.policyDraft!.Markdown = 'Borrador actualizado';

        component.savePolicyDraft();

        expect(component.hasOlderRevisions).toBeTrue();
        component.viewPreviousRevision();
        expect(component.displayedMarkdown).toBe('Contenido');
    });
});
