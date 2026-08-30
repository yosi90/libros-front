import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { CoverCachePipe } from '../../../../shared/cover-cache.pipe';
import { NativeReaderSessionService } from '../../../../services/navigation/native-reader-session.service';
import { NativeReaderSessionState } from '../../../../interfaces/native-reader';

@Component({
    selector: 'app-native-reader-island', standalone: true,
    imports: [MatIconModule, CoverCachePipe, AsyncPipe],
    templateUrl: './native-reader-island.component.html', styleUrl: './native-reader-island.component.sass',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class NativeReaderIslandComponent {
    @Input() previewState: NativeReaderSessionState | null = null;
    constructor(readonly reader: NativeReaderSessionService) { }

    get visible(): boolean { return !!this.previewState || this.reader.supported && this.reader.state().mode === 'minimized'; }
    get state(): NativeReaderSessionState { return this.previewState ?? this.reader.state(); }
    restore(): void { if (!this.previewState) void this.reader.restore(); }
    close(): void { if (!this.previewState) void this.reader.close(); }
}
