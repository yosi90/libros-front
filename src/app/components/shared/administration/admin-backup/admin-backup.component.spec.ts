import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Subject } from 'rxjs';
import { AdminBackupService } from '../../../../services/entities/admin-backup.service';
import { AdminBackupComponent } from './admin-backup.component';

describe('AdminBackupComponent', () => {
    let download: jasmine.Spy;
    let snackBar: jasmine.SpyObj<any>;
    let component: AdminBackupComponent;

    beforeEach(() => {
        download = jasmine.createSpy('download');
        snackBar = jasmine.createSpyObj('SnackbarModule', ['openSnackBar']);
        component = new AdminBackupComponent({ download } as unknown as AdminBackupService, snackBar);
    });

    it('requires explicit confirmation before requesting the backup', () => {
        spyOn(window, 'confirm').and.returnValue(false);

        component.downloadBackup();

        expect(download).not.toHaveBeenCalled();
        expect(component.isDownloading).toBeFalse();
    });

    it('prevents duplicate requests while a backup is being generated', () => {
        const response = new Subject<HttpResponse<Blob>>();
        spyOn(window, 'confirm').and.returnValue(true);
        download.and.returnValue(response.asObservable());

        component.downloadBackup();
        component.downloadBackup();

        expect(download).toHaveBeenCalledTimes(1);
        expect(component.isDownloading).toBeTrue();
        response.complete();
        expect(component.isDownloading).toBeFalse();
    });

    it('represents a forbidden response without exposing its body', () => {
        const response = new Subject<HttpResponse<Blob>>();
        spyOn(window, 'confirm').and.returnValue(true);
        download.and.returnValue(response.asObservable());

        component.downloadBackup();
        response.error(new HttpErrorResponse({ status: 403, error: { detail: 'internal-path' } }));

        expect(snackBar.openSnackBar).toHaveBeenCalledOnceWith('Solo una cuenta administradora puede generar backups.', 'errorBar');
        expect(JSON.stringify(snackBar.openSnackBar.calls.allArgs())).not.toContain('internal-path');
        expect(component.isDownloading).toBeFalse();
    });

    it('explains the deliberate QA restriction without exposing backend details', () => {
        const response = new Subject<HttpResponse<Blob>>();
        spyOn(window, 'confirm').and.returnValue(true);
        download.and.returnValue(response.asObservable());

        component.downloadBackup();
        response.error(new HttpErrorResponse({
            status: 409,
            error: { code: 'admin_backup_unavailable_in_qa', detail: 'private-server-path' }
        }));

        expect(snackBar.openSnackBar).toHaveBeenCalledOnceWith(
            'La descarga de backups no está disponible en el entorno de pruebas.',
            'errorBar'
        );
        expect(JSON.stringify(snackBar.openSnackBar.calls.allArgs())).not.toContain('private-server-path');
        expect(component.isDownloading).toBeFalse();
    });

    it('sanitizes the server filename and only accepts a zip suffix', () => {
        expect((component as any).fileName("attachment; filename*=UTF-8''copia%20privada.zip")).toBe('copia_privada.zip');
        expect((component as any).fileName('attachment; filename="dump.sql"')).toMatch(/^libros-backup-\d{4}-\d{2}-\d{2}\.zip$/);
    });
});
