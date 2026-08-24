import { Component, ChangeDetectionStrategy } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { AppTheme, ThemeService } from '../../../../services/ui/theme.service';

const THEME_LABELS: Record<AppTheme, string> = {
    wood: 'Wood',
    light: 'Claro',
    dark: 'Oscuro'
};

const THEME_ICONS: Record<AppTheme, string> = {
    wood: 'auto_stories',
    light: 'light_mode',
    dark: 'dark_mode'
};

@Component({
    standalone: true,
    selector: 'app-theme-switcher',
    imports: [MatIconModule],
    templateUrl: './theme-switcher.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrl: './theme-switcher.component.sass'
})
export class ThemeSwitcherComponent {
    constructor(readonly themes: ThemeService) { }

    get effectiveTheme(): AppTheme { return this.themes.effectiveTheme(); }
    get label(): string { return THEME_LABELS[this.effectiveTheme]; }
    get icon(): string { return THEME_ICONS[this.effectiveTheme]; }

    next(): void { this.themes.selectNextTheme(); }
}
