
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { AdminBackupService } from '../../../../services/entities/admin-backup.service';
import { SnackbarModule } from '../../../../modules/snackbar.module';
import { getProductStateMessage } from '../../../../shared/api-error-message';

@Component({
    standalone: true,
    selector: 'app-admin-backup',
    imports: [MatIconModule, SnackbarModule],
    templateUrl: './admin-backup.component.html',
    styleUrl: './admin-backup.component.sass'
})
export class AdminBackupComponent {
    isDownloading = false;

    constructor(private backups: AdminBackupService, private snackBar: SnackbarModule) { }

    downloadBackup(): void {
        if (this.isDownloading || !confirm('Se generará y descargará una copia de seguridad de la base de datos. ¿Continuar?'))
            return;

        this.isDownloading = true;
        this.backups.download().subscribe({
            next: response => {
                try {
                    this.saveResponse(response);
                    this.snackBar.openSnackBar('Backup generado y descargado', 'successBar');
                } catch (error) {
                    this.snackBar.openSnackBar(getProductStateMessage(error, 'El backup recibido no se pudo descargar.'), 'errorBar');
                }
            },
            error: error => {
                this.isDownloading = false;
                this.snackBar.openSnackBar(this.errorMessage(error), 'errorBar');
            },
            complete: () => this.isDownloading = false
        });
    }

    private saveResponse(response: HttpResponse<Blob>): void {
        if (!response.body || response.body.size === 0)
            throw new Error('El backup generado está vacío.');
        const contentType = (response.headers.get('Content-Type') || response.body.type).split(';')[0].trim().toLowerCase();
        if (contentType && contentType !== 'application/zip')
            throw new Error('El servidor no devolvió un archivo ZIP válido.');

        const objectUrl = URL.createObjectURL(response.body);
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = this.fileName(response.headers.get('Content-Disposition'));
        link.rel = 'noopener';
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
    }

    private fileName(contentDisposition: string | null): string {
        const encoded = contentDisposition?.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
        const plain = contentDisposition?.match(/filename="?([^";]+)"?/i)?.[1];
        const suggested = encoded ? this.safeDecode(encoded) : plain;
        const safeName = suggested?.trim().replace(/[^a-zA-Z0-9._-]/g, '_');
        return safeName?.toLowerCase().endsWith('.zip')
            ? safeName
            : `libros-backup-${new Date().toISOString().slice(0, 10)}.zip`;
    }

    private safeDecode(value: string): string {
        try {
            return decodeURIComponent(value);
        } catch {
            return value;
        }
    }

    private errorMessage(error: unknown): string {
        if (error instanceof HttpErrorResponse && error.status === 403)
            return 'Solo una cuenta administradora puede generar backups.';
        return getProductStateMessage(error, 'No se pudo generar el backup. Inténtalo de nuevo más tarde.');
    }
}
