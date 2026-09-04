import { Inject, Injectable } from '@angular/core';
import { ActionSheet, ActionSheetButtonStyle } from '@capacitor/action-sheet';
import { Camera, CameraErrorCode, MediaResult, MediaTypeSelection } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { NATIVE_MOBILE_PLATFORM } from '../ui/presentation-mode.service';

@Injectable({ providedIn: 'root' })
export class NativeProfileImageService {
    constructor(@Inject(NATIVE_MOBILE_PLATFORM) private nativeMobile: boolean) { }

    async choose(): Promise<File | null> {
        if (!this.nativeMobile)
            return null;

        const choice = await ActionSheet.showActions({
            title: 'Actualizar foto de perfil',
            cancelable: true,
            options: [
                { title: 'Hacer una foto' },
                { title: 'Elegir de la galería' },
                { title: 'Cancelar', style: ActionSheetButtonStyle.Cancel }
            ]
        });
        if (choice.canceled || choice.index < 0 || choice.index === 2)
            return null;

        try {
            const media = choice.index === 0
                ? await Camera.takePhoto({ quality: 90, targetWidth: 1600, targetHeight: 1600, correctOrientation: true, saveToGallery: false })
                : (await Camera.chooseFromGallery({ mediaType: MediaTypeSelection.Photo, allowMultipleSelection: false, quality: 90, targetWidth: 1600, targetHeight: 1600, correctOrientation: true })).results[0];
            return media ? this.toFile(media) : null;
        } catch (error) {
            const code = (error as { code?: unknown })?.code;
            if (code === CameraErrorCode.TakePhotoCancelled || code === CameraErrorCode.ChooseMediaCancelled)
                return null;
            throw error;
        }
    }

    private async toFile(media: MediaResult): Promise<File> {
        const source = media.webPath ?? (media.uri ? Capacitor.convertFileSrc(media.uri) : null);
        if (!source)
            throw new Error('Android no devolvió una ruta para la imagen elegida.');
        const response = await fetch(source);
        if (!response.ok)
            throw new Error('No se pudo leer la imagen elegida.');
        const blob = await response.blob();
        const format = (media.metadata?.format || blob.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
        return new File([blob], `perfil.${format}`, { type: blob.type || `image/${format === 'jpg' ? 'jpeg' : format}` });
    }
}
